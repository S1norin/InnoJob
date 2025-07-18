import { SERVER_URL } from "/web/config.js";
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');
    const codeInputs = document.querySelectorAll('.code-input');
    const email = localStorage.getItem('emailToConfirm');
    console.log('ConfirmPage: email из localStorage:', email);

    if (!email) {
        alert("Email не найден. Пожалуйста, зарегистрируйтесь заново.");
        window.location.href = "/sign_up_page";
        return;
    }

    codeInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === "Backspace" && input.value === "" && index > 0) {
                codeInputs[index - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const digits = paste.replace(/\D/g, '').slice(0, codeInputs.length);
            if (digits.length > 0) {
                codeInputs.forEach((inp, idx) => {
                    inp.value = digits[idx] || '';
                });
                // Фокус на последний заполненный input
                const lastFilled = Math.min(digits.length, codeInputs.length) - 1;
                if (lastFilled >= 0) {
                    codeInputs[lastFilled].focus();
                }
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = Array.from(codeInputs).map(input => input.value).join('');
        console.log('ConfirmPage: отправляем email и code:', email, code);

        if (code.length !== 6 || isNaN(code)) {
            alert("Введите корректный 6-значный код.");
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/login/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const result = await response.json();
            console.log('ConfirmPage: ответ сервера:', result);

            if (response.ok) {
                alert("Почта подтверждена!");
                if (localStorage.getItem('resetPasswordFlow')) {
                    window.location.href = "/password_page";
                } else if (localStorage.getItem('employerFlow')) {
                    localStorage.removeItem('employerFlow');
                    window.location.href = "/cv_listing_page";
                } else {
                    localStorage.removeItem('emailToConfirm');
                    window.location.href = "/log_in_page";
                }
            } else {
                alert(result.detail || "Ошибка подтверждения");
            }

        } catch (err) {
            console.error('ConfirmPage: ошибка при подтверждении:', err);
            alert("Сервер недоступен. Попробуйте позже.");
        }
    });
});
