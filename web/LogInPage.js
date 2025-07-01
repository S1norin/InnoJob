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
        const response = await fetch('http://localhost:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            // Fetch user info
            fetch(`http://localhost:8000/user_info?user_email=${encodeURIComponent(email)}`)
                .then(res => res.json())
                .then(userInfo => {
                    if (userInfo.name) {
                        const [firstName, ...rest] = userInfo.name.split(' ');
                        localStorage.setItem("userName", firstName);
                        localStorage.setItem("userSurname", rest.join(' '));
                    }
                    localStorage.setItem("userEmail", email);
                    window.location.href = "MainPage.html";
                });
        } else if (result.status === "error" && result.message === "Код не подтвержден") {
            alert("Пожалуйста, подтвердите почту");
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

const cvInput = document.getElementById('cvInput');
const uploadCvBtn = document.getElementById('uploadCvBtn');
const photoInput = document.getElementById('photoInput');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');

// Trigger file input when button is clicked
uploadCvBtn.addEventListener('click', (e) => {
    e.preventDefault();
    cvInput.click();
});
uploadPhotoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    photoInput.click();
});

// Upload CV
cvInput.addEventListener('change', async function () {
    const file = cvInput.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
        alert("Please select a PDF file.");
        return;
    }
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Email пользователя не найден.");
        return;
    }
    const formData = new FormData();
    formData.append('email', email);
    formData.append('pdf_file', file);

    try {
        const response = await fetch('http://localhost:8000/upload-cv', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("CV успешно загружено!");
        } else {
            alert("Ошибка загрузки CV: " + (result.message || "Неизвестная ошибка"));
        }
    } catch (err) {
        alert("Ошибка соединения с сервером.");
        console.error(err);
    }
});

// Upload Photo
photoInput.addEventListener('change', async function () {
    const file = photoInput.files[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
        alert("Пожалуйста, выберите JPG или PNG файл.");
        return;
    }
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert("Email пользователя не найден.");
        return;
    }
    const formData = new FormData();
    formData.append('email', email);
    formData.append('photo', file);

    try {
        const response = await fetch('http://localhost:8000/upload-photo', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("Фото успешно загружено!");
        } else {
            alert("Ошибка загрузки фото: " + (result.message || "Неизвестная ошибка"));
        }
    } catch (err) {
        alert("Ошибка соединения с сервером.");
        console.error(err);
    }
});
