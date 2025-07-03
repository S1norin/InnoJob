const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelectorAll('input').forEach(input => input.classList.remove('error'));
    document.getElementById('email-error').textContent = '';
    document.getElementById('password-error').textContent = '';

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    let isValid = true;

    if (!emailRegex.test(email.value.trim())) {
        email.classList.add('error');
        document.getElementById('email-error').textContent = "Неверный формат email";
        isValid = false;
    }

    if (password.value !== confirmPassword.value) {
        password.classList.add('error');
        confirmPassword.classList.add('error');
        document.getElementById('password-error').textContent = "Пароли не совпадают";
        isValid = false;
    }

    if (!isValid) return;

    const userData = {
        name: firstName + ' ' + lastName,
        email: email.value.trim(),
        password: password.value
    };

    try {
        const response = await fetch('http://innojob.ru/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("emailToConfirm", userData.email);
            localStorage.setItem("userName", firstName);
            localStorage.setItem("userSurname", lastName);
            localStorage.setItem("userEmail", userData.email);
            alert("Регистрация прошла успешно. Подтвердите почту.");
            window.location.href = "ConfirmPage.html";
        } else {
            document.getElementById('email-error').textContent = result.detail || "Ошибка регистрации";
        }

    } catch (err) {
        console.error('Ошибка:', err);
        document.getElementById('email-error').textContent = "Сервер недоступен";
    }
});
