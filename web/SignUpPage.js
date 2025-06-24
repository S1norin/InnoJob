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

    function goToConfirmPage() {
        window.location.href = "ConfirmPage.html";
    }

    if (!isValid) return;

    const userData = {
        name: firstName + ' ' + lastName,
        email: email.value.trim(),
        password: password.value
    };

    try {
        const response = await fetch('http://localhost:8000/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });


        if (!response.ok) {
            alert("регистрация прошла успешно")
            goToConfirmPage()
        } else {
            document.getElementById('email-error').textContent = result.detail || "Ошибка регистрации";
        }

    } catch (err) {
        console.error('Ошибка:', err);
        document.getElementById('email-error').textContent = "Сервер недоступен";
    }
});
