async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Сброс всех ошибок
    document.querySelectorAll('input').forEach(input => input.classList.remove('error'));
    document.getElementById('email-error').textContent = '';
    document.getElementById('password-error').textContent = '';

    // Получаем поля
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

    function goToMainPage() {
        window.location.href = "MainPage.html";
    }

    if (!isValid) return;

    const hashedPassword = await hashPassword(password.value);

    const userData = {
        name: firstName + ' ' + lastName,
        email: email.value.trim(),
        password: hashedPassword
    };

    try {
        const response = await fetch('http://localhost:8000/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });


        if (response.ok) {
            alert("пашёл нахуй")
            goToMainPage()
        } else {
            document.getElementById('email-error').textContent = result.detail || "Ошибка регистрации";
        }

    } catch (err) {
        console.error('Ошибка:', err);
        document.getElementById('email-error').textContent = "Сервер недоступен";
    }
});
