import { SERVER_URL } from "/web/config.js";
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');
    const codeInputs = document.querySelectorAll('.code-input');
    const email = localStorage.getItem('emailToConfirm');

    if (!email) {
        alert("Email не найден. Пожалуйста, зарегистрируйтесь заново.");
        window.location.href = "SignUpPage.html";
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
    });

    // Обработка формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6 || isNaN(code)) {
            alert("Введите корректный 6-значный код.");
            return;
        }

        try {
            const response = await fetch('${SERVER_URL}/login/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const result = await response.json();

            if (response.ok) {
                alert("Почта подтверждена!");
                localStorage.removeItem('emailToConfirm');
                window.location.href = "LogInPage.html";
            } else {
                alert(result.detail || "Ошибка подтверждения");
            }

        } catch (err) {
            console.error("Ошибка при подтверждении:", err);
            alert("Сервер недоступен. Попробуйте позже.");
        }
    });
});
