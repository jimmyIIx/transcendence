package com.ft.transcendence.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Minimal integration with the TK42 BEP-20 contract on BSC.
 * Only used for the custodial "admin credit -> mint real tokens" flow.
 * Everything else (betting, payouts) stays off-chain in the database.
 */
@Service
public class BlockchainService {

    private static final Logger log = LoggerFactory.getLogger(BlockchainService.class);
    private static final Pattern ADDRESS_PATTERN = Pattern.compile("^0x[0-9a-fA-F]{40}$");

    @Value("${blockchain.enabled:false}")
    private boolean enabled;

    @Value("${blockchain.rpc-url:}")
    private String rpcUrl;

    @Value("${blockchain.chain-id:97}")
    private long chainId;

    @Value("${blockchain.contract-address:}")
    private String contractAddress;

    @Value("${blockchain.token-decimals:18}")
    private int tokenDecimals;

    @Value("${blockchain.private-key:}")
    private String privateKey;

    @Value("${blockchain.gas-limit:300000}")
    private long gasLimit;

    private Web3j web3j;
    private Credentials credentials;
    private RawTransactionManager transactionManager;

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("BlockchainService disabled (blockchain.enabled=false). Mints will be skipped.");
            return;
        }
        if (rpcUrl == null || rpcUrl.isBlank()
                || privateKey == null || privateKey.isBlank()
                || contractAddress == null || contractAddress.isBlank()) {
            log.warn("BlockchainService enabled but rpc-url / private-key / contract-address is missing. Mints will be skipped.");
            enabled = false;
            return;
        }
        try {
            this.web3j = Web3j.build(new HttpService(rpcUrl));
            this.credentials = Credentials.create(privateKey);
            this.transactionManager = new RawTransactionManager(web3j, credentials, chainId);
            log.info("BlockchainService ready. Hot wallet: {}, contract: {}, chainId: {}",
                    credentials.getAddress(), contractAddress, chainId);
        } catch (Exception e) {
            log.error("Failed to initialize BlockchainService: {}", e.getMessage(), e);
            enabled = false;
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public static boolean isValidAddress(String address) {
        return address != null && ADDRESS_PATTERN.matcher(address.trim()).matches();
    }

    /**
     * Mints {@code amount} TK42 (human units) to the given address by calling mint(address,uint256).
     * The configured hot wallet MUST be the owner of the contract.
     *
     * @return the transaction hash
     * @throws IllegalStateException if the chain is unavailable or the transaction is rejected
     */
    public String mint(String toAddress, BigDecimal amount) {
        if (!enabled) {
            throw new IllegalStateException("Blockchain integration is disabled");
        }
        if (!isValidAddress(toAddress)) {
            throw new IllegalArgumentException("Adresse de wallet invalide: " + toAddress);
        }
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Le montant à minter doit être positif");
        }

        BigInteger rawAmount = amount
                .multiply(BigDecimal.TEN.pow(tokenDecimals))
                .toBigInteger();

        Function function = new Function(
                "mint",
                List.of(new Address(toAddress.trim()), new Uint256(rawAmount)),
                Collections.emptyList()
        );
        String encodedData = FunctionEncoder.encode(function);

        try {
            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
            EthSendTransaction tx = transactionManager.sendTransaction(
                    gasPrice,
                    BigInteger.valueOf(gasLimit),
                    contractAddress,
                    encodedData,
                    BigInteger.ZERO
            );
            if (tx.hasError()) {
                throw new IllegalStateException("Mint rejeté par la blockchain: " + tx.getError().getMessage());
            }
            String txHash = tx.getTransactionHash();
            log.info("Mint TK42 envoyé: {} -> {} ({} TK42), txHash={}",
                    credentials.getAddress(), toAddress, amount, txHash);
            return txHash;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Mint TK42 échoué pour {}: {}", toAddress, e.getMessage(), e);
            throw new IllegalStateException("Échec du mint on-chain: " + e.getMessage(), e);
        }
    }

    public String getHotWalletAddress() {
        return credentials != null ? credentials.getAddress() : null;
    }
}
