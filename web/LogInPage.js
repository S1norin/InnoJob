import { SERVER_URL } from './config.js';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    document.querySelectorAll('input').forEach(input => input.classList.remove('error'));
    document.getElementById('email-error')?.remove();
    document.getElementById('password-error')?.remove();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let isValid = true;

    if (!emailRegex.test(email)) {
        showError(emailInput, "Неверный email", "email-error");
        isValid = false;
    }

    if (password === "") {
        showError(passwordInput, "Введите пароль", "password-error");
        isValid = false;
    }

    if (!isValid) return;


    const loginData = {
        email: email,
        password: passwordInput.value
    };

    console.log("Email:", loginData.email);
    console.log("Password:", loginData.password);

    try {
        const response = await fetch(`${SERVER_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            // Fetch user info
            fetch(`${SERVER_URL}/user_info?user_email=${encodeURIComponent(email)}`)
                .then(res => res.json())
                .then(userInfo => {
                    if (userInfo.name) {
                        const [firstName, ...rest] = userInfo.name.split(' ');
                        localStorage.setItem("userName", firstName);
                        localStorage.setItem("userSurname", rest.join(' '));
                    }
                    localStorage.setItem("userEmail", email);
                    window.location.href = "/job_listing";
                });
        } else {
            showError(passwordInput, result.detail || result.message || "Ошибка входа", "password-error");
        }

    } catch (err) {
        console.error("Ошибка при отправке запроса:", err);
        showError(passwordInput, "Сервер недоступен", "password-error");
    }
});

function showError(inputElement, message, id) {
    inputElement.classList.add('error');
    const span = document.createElement('span');
    span.className = 'error-message';
    span.id = id;
    span.textContent = message;
    inputElement.insertAdjacentElement('afterend', span);
}


