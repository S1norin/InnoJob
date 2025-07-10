document.addEventListener('DOMContentLoaded', function () {
    const skillsSearch = document.getElementById('skillsSearch');
    const skillsDropdown = document.getElementById('skillsDropdown');
    const selectedSkillsContainer = document.getElementById('selectedSkills');
    const skillsInputWrapper = skillsSearch.parentElement;

    let selectedSkills = [];

    // Показать/скрыть выпадающий список
    skillsSearch.addEventListener('click', function () {
        toggleDropdown();
    });

    skillsSearch.addEventListener('focus', function () {
        showDropdown();
    });

    // Поиск навыков
    skillsSearch.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        filterSkills(searchTerm);
        showDropdown();
    });

    // Выбор навыка
    skillsDropdown.addEventListener('click', function (e) {
        if (e.target.classList.contains('skills-option')) {
            const skillValue = e.target.getAttribute('data-value');
            const skillText = e.target.textContent;

            if (!selectedSkills.some(skill => skill.value === skillValue)) {
                addSkill(skillValue, skillText);
                skillsSearch.value = '';
                filterSkills('');
            }
        }
    });

    // Закрыть выпадающий список при клике вне его
    document.addEventListener('click', function (e) {
        if (!skillsInputWrapper.contains(e.target) && !skillsDropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    function toggleDropdown() {
        if (skillsDropdown.classList.contains('show')) {
            hideDropdown();
        } else {
            showDropdown();
        }
    }

    function showDropdown() {
        skillsDropdown.classList.add('show');
        skillsInputWrapper.classList.add('active');
    }

    function hideDropdown() {
        skillsDropdown.classList.remove('show');
        skillsInputWrapper.classList.remove('active');
    }

    function filterSkills(searchTerm) {
        const options = skillsDropdown.querySelectorAll('.skills-option');

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.getAttribute('data-value').toLowerCase();

            if (text.includes(searchTerm) || value.includes(searchTerm)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }

            // Скрыть уже выбранные навыки
            if (selectedSkills.some(skill => skill.value === option.getAttribute('data-value'))) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    function addSkill(value, text) {
        selectedSkills.push({ value, text });
        renderSelectedSkills();
        updateDropdownOptions();
    }

    function removeSkill(value) {
        selectedSkills = selectedSkills.filter(skill => skill.value !== value);
        renderSelectedSkills();
        updateDropdownOptions();
    }

    function renderSelectedSkills() {
        selectedSkillsContainer.innerHTML = '';

        selectedSkills.forEach(skill => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `
                ${skill.text}
                <button type="button" class="skill-remove" onclick="removeSkillByValue('${skill.value}')">×</button>
            `;
            selectedSkillsContainer.appendChild(skillTag);
        });
    }

    function updateDropdownOptions() {
        const options = skillsDropdown.querySelectorAll('.skills-option');
        options.forEach(option => {
            const value = option.getAttribute('data-value');
            if (selectedSkills.some(skill => skill.value === value)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // Глобальная функция для кнопки удаления
    window.removeSkillByValue = function (value) {
        removeSkill(value);
    };

    // Helper to get email from localStorage (adjust key if needed)
    function getUserEmail() {
        return localStorage.getItem('emailToConfirm') || localStorage.getItem('userEmail');
    }

    // Get references to all fields
    const emailInput = document.querySelector('.email-input');
    const nameInputs = document.querySelectorAll('.name-input');
    const educationSelect = document.querySelectorAll('.form-select')[0];
    const courseSelect = document.querySelectorAll('.form-select')[1];
    const descriptionTextarea = document.querySelector('.form-textarea');
    const saveBtn = document.querySelector('.save-btn');

    // On page load, fill email, name, surname from localStorage if available
    const email = getUserEmail();
    if (emailInput && email) emailInput.value = email;

    // Helper to fill name and surname from userInfo.name
    function fillNameFieldsFromFullName(fullName) {
        if (!fullName) return;
        const [firstName, ...rest] = fullName.split(' ');
        if (nameInputs[0]) nameInputs[0].value = firstName;
        if (nameInputs[1]) nameInputs[1].value = rest.join(' ');
        localStorage.setItem('userName', firstName);
        localStorage.setItem('userSurname', rest.join(' '));
    }

    // Try to fill from localStorage, otherwise fetch from backend
    let nameFilled = false;
    if (nameInputs[0] && localStorage.getItem('userName')) {
        nameInputs[0].value = localStorage.getItem('userName');
        nameFilled = true;
    }
    if (nameInputs[1] && localStorage.getItem('userSurname')) {
        nameInputs[1].value = localStorage.getItem('userSurname');
        nameFilled = true;
    }
    // If not filled, fetch from backend
    if ((!localStorage.getItem('userName') || !localStorage.getItem('userSurname')) && email) {
        fetch(`https://innojob.ru/user_info?user_email=${encodeURIComponent(email)}`)
            .then(res => res.json())
            .then(userInfo => {
                if (userInfo.name) {
                    fillNameFieldsFromFullName(userInfo.name);
                    if (educationSelect && userInfo.educationLevel) educationSelect.value = userInfo.educationLevel;
                    if (courseSelect && userInfo.course) courseSelect.value = userInfo.course;
                    if (descriptionTextarea && userInfo.description) descriptionTextarea.value = userInfo.description;
                    if (userInfo.skills && Array.isArray(userInfo.skills)) {
                        selectedSkills = userInfo.skills.map(skill => ({ value: skill, text: skill }));
                        renderSelectedSkills();
                        updateDropdownOptions();
                    }
                    showProfilePhoto(email);
                    showCvPreview(email);
                }
            });
    }

    // Helper to fetch and fill all profile data from backend
    function fetchAndFillProfile(email) {
        if (!email) return;
        fetch(`https://innojob.ru/user_info?user_email=${encodeURIComponent(email)}`)
            .then(res => res.json())
            .then(userInfo => {
                if (userInfo.name) fillNameFieldsFromFullName(userInfo.name);
                if (educationSelect && userInfo.educationLevel) educationSelect.value = userInfo.educationLevel;
                if (courseSelect && userInfo.course) courseSelect.value = userInfo.course;
                if (descriptionTextarea && userInfo.description) descriptionTextarea.value = userInfo.description;
                if (userInfo.skills && Array.isArray(userInfo.skills)) {
                    selectedSkills = userInfo.skills.map(skill => ({ value: skill, text: skill }));
                    renderSelectedSkills();
                    updateDropdownOptions();
                }
                showProfilePhoto(email);
                showCvPreview(email);
            });
    }

    // On page load, always fetch and fill profile
    if (email) {
        fetchAndFillProfile(email);
    }

    // After saving profile, uploading photo, or uploading CV, re-fetch profile
    function afterProfileUpdate() {
        if (email) fetchAndFillProfile(email);
    }

    // Save button event
    saveBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const name = nameInputs[0].value.trim();
        const surname = nameInputs[1].value.trim();
        const fullName = name + (surname ? ' ' + surname : '');
        const educationLevel = educationSelect.value;
        const course = courseSelect.value;
        const description = descriptionTextarea.value.trim();
        const skills = selectedSkills.map(skill => skill.text); // or skill.value if backend expects value

        // Store name, surname, and email in localStorage (for later use)
        localStorage.setItem('userName', name);
        localStorage.setItem('userSurname', surname);
        if (email) localStorage.setItem('userEmail', email);

        // Prepare data for backend
        const data = {
            name: fullName,
            educationLevel,
            course,
            description,
            skills
        };

        if (!email) {
            alert('Email пользователя не найден. Пожалуйста, войдите заново.');
            return;
        }

        try {
            const response = await fetch(`https://innojob.ru/write_user_info?user_email=${encodeURIComponent(email)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.access) {
                alert('Профиль успешно сохранён!');
                afterProfileUpdate();
            } else {
                alert('Ошибка сохранения профиля: ' + (result.message || JSON.stringify(result) || 'Неизвестная ошибка'));
            }
        } catch (err) {
            alert('Ошибка соединения с сервером.');
            console.error(err);
        }
    });

    // Add references for new elements
    const cvInput = document.getElementById('cvInput');
    const uploadCvBtn = document.getElementById('uploadCvBtn');
    const photoInput = document.getElementById('photoInput');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const profilePhoto = document.getElementById('profilePhoto');
    const cvPreview = document.getElementById('cvPreview');

    // Helper to show profile photo
    function showProfilePhoto(email) {
        fetch(`https://innojob.ru/users/photo/${encodeURIComponent(email)}`)
            .then(res => {
                if (!res.ok) throw new Error('No photo');
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                profilePhoto.src = url;
                profilePhoto.style.display = 'block';
                document.querySelector('.image-placeholder').style.display = 'none';
            })
            .catch(() => {
                profilePhoto.style.display = 'none';
                document.querySelector('.image-placeholder').style.display = 'block';
            });
    }

    // Helper to show CV preview
    function showCvPreview(email) {
        fetch(`https://innojob.ru/users/cv/${encodeURIComponent(email)}`)
            .then(res => {
                if (!res.ok) throw new Error('No CV');
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                cvPreview.innerHTML = `<a href="${url}" target="_blank"><img src="/web/pdf_icon.png" alt="CV" style="width:32px;height:32px;vertical-align:middle;"> Скачать CV</a>`;
            })
            .catch(() => {
                cvPreview.innerHTML = '';
            });
    }

    // Upload photo logic
    uploadPhotoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        photoInput.click();
    });
    photoInput.addEventListener('change', async function () {
        const file = photoInput.files[0];
        if (!file) return;
        if (!["image/png", "image/jpeg"].includes(file.type)) {
            alert("Пожалуйста, выберите JPG или PNG файл.");
            return;
        }
        if (!email) {
            alert("Email пользователя не найден.");
            return;
        }
        const formData = new FormData();
        formData.append('email', email);
        formData.append('photo', file);
        try {
            const response = await fetch('https://innojob.ru/upload-photo', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === "success") {
                alert("Фото успешно загружено!");
                afterProfileUpdate();
            } else {
                alert("Ошибка загрузки фото: " + (result.message || "Неизвестная ошибка"));
            }
        } catch (err) {
            alert("Ошибка соединения с сервером.");
            console.error(err);
        }
    });

    // Upload CV logic
    uploadCvBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cvInput.click();
    });
    cvInput.addEventListener('change', async function () {
        const file = cvInput.files[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
            alert("Please select a PDF file.");
            return;
        }
        if (!email) {
            alert("Email пользователя не найден.");
            return;
        }
        const formData = new FormData();
        formData.append('email', email);
        formData.append('pdf_file', file);
        try {
            const response = await fetch('https://innojob.ru/upload-cv', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === "success") {
                alert("CV успешно загружено!");
                afterProfileUpdate();
            } else {
                alert("Ошибка загрузки CV: " + (result.message || "Неизвестная ошибка"));
            }
        } catch (err) {
            alert("Ошибка соединения с сервером.");
            console.error(err);
        }
    });
});

