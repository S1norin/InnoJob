import { SERVER_URL } from "/web/config.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        emailError.textContent = '';
        const email = emailInput.value.trim().toLowerCase();
        console.log('Отправляемый email:', email);
        if (!email) {
            emailError.textContent = 'Введите email';
            return;
        }
        try {
            const checkRes = await fetch(`${SERVER_URL}/write-mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mail: email })
            });
            console.log('Статус ответа:', checkRes.status);
            const checkData = await checkRes.json();
            console.log('Ответ сервера:', checkData);
            if (!checkData.access) {
                emailError.textContent = 'Пользователь с таким email не найден или не подтверждён.';
                return;
            }
            localStorage.setItem('emailToConfirm', email);
            localStorage.setItem('resetPasswordFlow', '1');
            window.location.href = '/confirmation';
        } catch (err) {
            console.error('Ошибка при запросе:', err);
            emailError.textContent = 'Ошибка сервера. Попробуйте позже.';
        }
    });
});

