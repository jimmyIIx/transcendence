package com.ft.transcendence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TranscendenceApplication {

	public static void main(String[] args) {
		SpringApplication.run(TranscendenceApplication.class, args);
	}

}
