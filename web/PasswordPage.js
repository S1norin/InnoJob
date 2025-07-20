import { SERVER_URL } from "/web/config.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorSpan = document.getElementById('password-error');

    const email = localStorage.getItem('emailToConfirm');
    console.log('PasswordPage: email из localStorage:', email);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorSpan.textContent = '';
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        console.log('PasswordPage: отправляем email и новый пароль:', email, password);
        if (!password || !confirmPassword) {
            errorSpan.textContent = 'Заполните оба поля';
            return;
        }

        if (password !== confirmPassword) {
            errorSpan.textContent = 'Пароли не совпадают';
            return;
        }
        if (!email) {
            errorSpan.textContent = 'Email не найден. Попробуйте восстановление заново.';
            return;
        }
        try {
            const response = await fetch(`${SERVER_URL}/change_password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mail: email, new_password: password })
            });
            const result = await response.json();
            console.log('PasswordPage: ответ сервера:', result);
            if (response.ok && result.status) {
                localStorage.removeItem('emailToConfirm');
                localStorage.removeItem('resetPasswordFlow');
                alert('Пароль успешно изменён!');
                window.location.href = '/log_in_page';
            } else {
                errorSpan.textContent = result.message || 'Ошибка смены пароля';
            }
        } catch (err) {
            console.error('PasswordPage: ошибка при смене пароля:', err);
            errorSpan.textContent = 'Ошибка сервера. Попробуйте позже.';
        }
    });
});
