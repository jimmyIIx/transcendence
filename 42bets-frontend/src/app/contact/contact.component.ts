import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appConfig } from '../config/app-config';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UiButtonComponent } from '../shared/ui/ui-button/ui-button.component';
import { UiCardComponent } from '../shared/ui/ui-card/ui-card.component';
import { UiInputComponent } from '../shared/ui/ui-input/ui-input.component';
import { UiTextareaComponent } from '../shared/ui/ui-textarea/ui-textarea.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiCardComponent, UiInputComponent, UiTextareaComponent, TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  private http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private apiUrl = `${appConfig.apiUrl}/api/contact`;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  onSubmit(event: Event) {
    event.preventDefault();

    if (this.isSubmitting) {
      return;
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const body = {
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.isSubmitting = true;

    this.http.post(this.apiUrl, body).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('CONTACT.SUCCESS_MESSAGE');
        form.reset();
        this.isSubmitting = false;
      },
      error: () => {
        this.errorMessage = this.translate.instant('CONTACT.ERROR_MESSAGE');
        this.isSubmitting = false;
      }
    });
  }
}