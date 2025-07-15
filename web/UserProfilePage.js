document.addEventListener('DOMContentLoaded', function () {
    // --- ЭЛЕМЕНТЫ ---
    const skillsSearch = document.getElementById('skillsSearch');
    const skillsDropdown = document.getElementById('skillsDropdown');
    const selectedSkillsContainer = document.getElementById('selectedSkills');
    const skillsInputWrapper = skillsSearch?.parentElement;

    const emailInput = document.querySelector('.email-input');
    const nameInputs = document.querySelectorAll('.name-input');
    const educationLevel = document.getElementById('educationLevel');
    const educationStatus = document.getElementById('educationStatus');
    const description = document.getElementById('description');
    const saveBtn = document.getElementById('saveBtn');
    const addCvBtn = document.getElementById('addCvBtn');
    const cardsContainer = document.getElementById('cardsContainer');

    const photoInput = document.getElementById('photoInput');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const cvInput = document.getElementById('cvInput');
    const uploadCvBtn = document.getElementById('uploadCvBtn');
    const profilePhoto = document.getElementById('profilePhoto');
    const cvPreview = document.getElementById('cvPreview');

    // --- СОСТОЯНИЕ ---
    let selectedSkills = [];
    let userCards = [];
    let editingCardId = null;
    let currentPhotoUrl = null;
    let currentCvUrl = null;
    let currentPhotoFile = null;
    let currentCvFile = null;

    // --- LOCALSTORAGE ---
    function checkLocalStorageSupport() {
        try {
            const testKey = 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Only store user email in localStorage
    function saveUserInfoToLocalStorage() {
        if (!checkLocalStorageSupport()) return;
        if (emailInput) localStorage.setItem('userEmail', emailInput.value);
    }

    function loadUserInfoFromLocalStorage() {
        if (emailInput) emailInput.value = localStorage.getItem('userEmail') || '';
        // Имя и фамилию больше не трогаем из localStorage
        console.log('loadUserInfoFromLocalStorage, email:', emailInput ? emailInput.value : '(нет emailInput)');
    }

    // --- FETCH USER INFO FROM BACKEND ---
    async function fetchUserInfo(email) {
        try {
            const res = await fetch(`/users/info?email=${encodeURIComponent(email)}`);
            if (!res.ok) return { name: '', surname: '' };
            const data = await res.json();
            return { name: data.name || '', surname: data.surname || '' };
        } catch (e) {
            return { name: '', surname: '' };
        }
    }

    // --- FETCH CARDS FROM BACKEND ---
    async function fetchUserCards() {
        console.log('fetchUserCards called, email:', emailInput ? emailInput.value : '(нет emailInput)');
        if (!emailInput || !emailInput.value.trim()) {
            userCards = [];
            renderCards();
            return;
        }
        isLoadingCards = true;
        renderCards();
        try {
            const res = await fetch(`/users/${emailInput.value.trim()}/cards`);
            if (!res.ok) throw new Error('Ошибка загрузки карточек');
            const cards = await res.json();
            // Получаем имя и фамилию из базы
            const userInfo = await fetchUserInfo(emailInput.value.trim());
            if (nameInputs[0]) nameInputs[0].value = userInfo.name;
            if (nameInputs[1]) nameInputs[1].value = userInfo.surname;
            // Для каждой карточки подгружаем фото
            userCards = await Promise.all(cards.map(async card => {
                let photoUrl = null;
                if (card.photo_name) {
                    try {
                        const photoRes = await fetch(`/users/photo/${emailInput.value.trim()}/${card.card_id}`);
                        if (photoRes.ok) {
                            const blob = await photoRes.blob();
                            photoUrl = URL.createObjectURL(blob);
                        }
                    } catch (e) { }
                }
                return {
                    id: card.card_id,
                    educationLevel: card.education_level,
                    educationStatus: card.education_full,
                    description: card.description,
                    skills: card.skills,
                    photoFile: null,
                    photoUrl, // вот тут!
                    cvFile: null,
                    photoFileName: card.photo_name,
                    cvFileName: card.cv_name,
                    createdAt: null
                };
            }));
        } catch (error) {
            userCards = [];
            // alert('Ошибка загрузки карточек: ' + error.message); // Remove debug alert
        } finally {
            isLoadingCards = false;
            renderCards();
        }
    }

    function clearLocalStorage() {
        if (!checkLocalStorageSupport()) return;
        localStorage.removeItem('userEmail');
    }

    // --- ИНИЦИАЛИЗАЦИЯ ---
    loadUserInfoFromLocalStorage();
    setTimeout(() => {
        if (emailInput && emailInput.value.trim()) {
            fetchUserCards();
        }
    }, 100);
    let isLoadingCards = false;

    // Автоматическая загрузка карточек при изменении email
    if (emailInput) {
        emailInput.addEventListener('change', function () {
            saveUserInfoToLocalStorage();
            if (emailInput.value.trim()) fetchUserCards();
        });
        emailInput.addEventListener('blur', function () {
            saveUserInfoToLocalStorage();
            if (emailInput.value.trim()) fetchUserCards();
        });
    }

    // --- НАВЫКИ ---
    if (skillsSearch) {
        skillsSearch.addEventListener('click', toggleDropdown);
        skillsSearch.addEventListener('focus', showDropdown);
        skillsSearch.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            filterSkills(searchTerm);
            showDropdown();
        });
    }
    if (skillsDropdown) {
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
    }
    document.addEventListener('click', function (e) {
        if (skillsInputWrapper && !skillsInputWrapper.contains(e.target) &&
            skillsDropdown && !skillsDropdown.contains(e.target)) {
            hideDropdown();
        }
    });
    function toggleDropdown() {
        if (!skillsDropdown) return;
        if (skillsDropdown.classList.contains('show')) hideDropdown();
        else showDropdown();
    }
    function showDropdown() {
        if (!skillsDropdown || !skillsInputWrapper) return;
        skillsDropdown.classList.add('show');
        skillsInputWrapper.classList.add('active');
    }
    function hideDropdown() {
        if (!skillsDropdown || !skillsInputWrapper) return;
        skillsDropdown.classList.remove('show');
        skillsInputWrapper.classList.remove('active');
    }
    function filterSkills(searchTerm) {
        if (!skillsDropdown) return;
        const options = skillsDropdown.querySelectorAll('.skills-option');
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.getAttribute('data-value').toLowerCase();
            if (text.includes(searchTerm) || value.includes(searchTerm)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }
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
    }
    function removeSkill(value) {
        selectedSkills = selectedSkills.filter(skill => skill.value !== value);
        renderSelectedSkills();
    }
    function renderSelectedSkills() {
        if (!selectedSkillsContainer) return;
        selectedSkillsContainer.innerHTML = '';
        selectedSkills.forEach(skill => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `
                ${skill.text}
                <button type="button" class="skill-remove" data-skill="${skill.value}">×</button>
            `;
            selectedSkillsContainer.appendChild(skillTag);
        });
        selectedSkillsContainer.querySelectorAll('.skill-remove').forEach(btn => {
            btn.addEventListener('click', function () {
                removeSkill(this.getAttribute('data-skill'));
            });
        });
    }

    // --- СОЗДАНИЕ/ОБНОВЛЕНИЕ КАРТОЧКИ С ОТПРАВКОЙ В БД ---
    async function createCard() {
        try {
            // Validate required fields
            const eduLevel = educationLevel?.value || '';
            const eduStatus = educationStatus?.value || '';
            const desc = description?.value.trim() || '';
            const skills = selectedSkills.map(skill => skill.text);
            const email = emailInput.value.trim();
            if (!email) {
                alert('Пожалуйста, укажите email');
                return;
            }
            // if (!eduLevel || !eduStatus || !desc || skills.length === 0) {
            //     alert('Пожалуйста, заполните все поля и выберите хотя бы один навык');
            //     return;
            // }
            if (saveBtn) saveBtn.disabled = true;
            let isNewCard = (editingCardId == null);
            let cardId = null; // <-- объявляем cardId здесь
            if (!isNewCard) {
                // PATCH-запрос
                cardId = editingCardId; // <-- присваиваем cardId
                try {
                    const updateResponse = await fetch(`/users/${email}/cards/${cardId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            education_level: eduLevel,
                            education_full: eduStatus,
                            age: 0,
                            description: desc,
                            skills
                        })
                    });
                    let updateData = {};
                    let isJson = false;
                    const contentType = updateResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        updateData = await updateResponse.json();
                        isJson = true;
                    } else {
                        updateData.message = await updateResponse.text();
                    }
                    if (!updateResponse.ok || (isJson && updateData.access === false)) {
                        alert(updateData.message || 'Ошибка при обновлении карточки на сервере');
                        return;
                    }
                    // После успешного обновления сбрасываем editingCardId
                    editingCardId = null;
                    if (saveBtn) saveBtn.textContent = 'Сохранить';
                } catch (error) {
                    alert('Ошибка при обновлении карточки: ' + error.message);
                    return;
                }
            } else {
                // POST-запрос
                try {
                    const createResponse = await fetch(`/users/${email}/cards`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            education_level: eduLevel,
                            education_full: eduStatus,
                            age: 0,
                            description: desc,
                            skills
                        })
                    });
                    let createData = {};
                    let isJson = false;
                    const contentType = createResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        createData = await createResponse.json();
                        isJson = true;
                    } else {
                        createData.message = await createResponse.text();
                    }
                    if (!createResponse.ok || (isJson && createData.access === false)) {
                        alert(createData.message || 'Ошибка при создании карточки на сервере');
                        return;
                    }
                    cardId = createData.card_id; // <-- присваиваем cardId здесь
                    if (cardId === undefined || cardId === null) {
                        alert('Сервер не вернул card_id');
                        await fetchUserCards();
                        return;
                    }
                } catch (error) {
                    alert('Ошибка при создании карточки: ' + error.message);
                    return;
                }
            }
            // 2. Загружаем файлы на сервер (только если есть новые файлы)
            if (currentCvFile && cardId !== undefined && cardId !== null) {
                try {
                    const formData = new FormData();
                    formData.append('email', email);
                    formData.append('pdf_file', currentCvFile);
                    const cvResponse = await fetch(`/users/cv/${email}/${cardId}`, {
                        method: 'POST',
                        body: formData
                    });
                    if (!cvResponse.ok) {
                        const errText = await cvResponse.text();
                        alert('Ошибка при загрузке CV: ' + errText);
                        return;
                    }
                } catch (error) {
                    alert(error.message);
                    return;
                }
            }
            if (currentPhotoFile && cardId !== undefined && cardId !== null) {
                try {
                    const formData = new FormData();
                    formData.append('email', email);
                    formData.append('photo', currentPhotoFile);
                    const photoResponse = await fetch(`/users/photo/${email}/${cardId}`, {
                        method: 'POST',
                        body: formData
                    });
                    if (!photoResponse.ok) {
                        const errText = await photoResponse.text();
                        alert('Ошибка при загрузке фото: ' + errText);
                        return;
                    }
                } catch (error) {
                    alert(error.message);
                    return;
                }
            }
            // 3. Обновляем интерфейс
            await fetchUserCards();
            clearForm();
            saveUserInfoToLocalStorage();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    function renderCards() {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = ''
        if (!emailInput.value.trim()) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Введите email для отображения карточек.</p>';
            return;
        }
        userCards.forEach(card => {
            const cardElement = createCardElement(card);
            cardsContainer.appendChild(cardElement);
        });
    }

    function createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'cv-card';
        cardDiv.setAttribute('data-card-id', cardData.id);
        const skillsHTML = cardData.skills.map(skill =>
            `<div class="cv-skill-tag">${skill}</div>`
        ).join('');
        let photoContent = 'Фото';
        if (cardData.photoUrl) {
            photoContent = `<img src="${cardData.photoUrl}" alt="Photo"
                            style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
                            onerror="this.style.display='none'; this.parentElement.innerHTML='Ошибка загрузки фото';">`;
        }
        const cvButtonText = cardData.cvFileName ? 'Скачать CV' : 'CV отсутствует';
        const cvButtonDisabled = cardData.cvFileName ? '' : 'disabled';
        const userName = nameInputs[0] ? nameInputs[0].value : '';
        const userSurname = nameInputs[1] ? nameInputs[1].value : '';
        cardDiv.innerHTML = `
            <div class="card-header">
                <div class="logo-place">
                    ${photoContent}
                </div>
                <div class="job-title-info">
                    <h2>${userName}</h2>
                    <h2>${userSurname}</h2>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-item">
                    <img src="/pics/education.png" alt="education">
                    <span>${cardData.educationLevel}</span>
                </div>
                <div class="detail-item">
                    <span>${cardData.educationStatus}</span>
                </div>
            </div>
            <div class="cv-skills">
                ${skillsHTML}
            </div>
            <div class="card-description">
                <p>${cardData.description}</p>
            </div>
            <div class="card-files-info">
                <small style="color: #666;"> 
                     ${cardData.cvFileName || 'CV не загружено'}
                </small>
            </div>
            <div class="buttoms">
                <button class="apply-button" onclick="downloadCV(${cardData.id})" ${cvButtonDisabled}>${cvButtonText}</button>
                <button class="apply-button" onclick="editCard(${cardData.id})">Редактировать</button>
                <button class="apply-button delete-card" onclick="deleteCard(${cardData.id})">Удалить</button>
            </div>
        `;
        return cardDiv;
    }

    function clearForm() {
        // Очищаем поля формы
        if (educationLevel) educationLevel.value = '';
        if (educationStatus) educationStatus.value = '';
        if (description) description.value = '';
        selectedSkills = [];
        renderSelectedSkills();

        // Полная очистка файлов и их отображения
        if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
        if (currentCvUrl) URL.revokeObjectURL(currentCvUrl);

        currentPhotoUrl = null;
        currentCvUrl = null;
        currentPhotoFile = null;
        currentCvFile = null;

        // Сбрасываем отображение фото в профиле
        if (profilePhoto) {
            profilePhoto.style.display = 'none';
            profilePhoto.src = '';
        }
        const placeholder = document.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }

        // Сбрасываем отображение CV в профиле
        if (cvPreview) {
            cvPreview.innerHTML = '';
        }

        // Очищаем input файлов
        if (photoInput) photoInput.value = '';
        if (cvInput) cvInput.value = '';

        // Сбрасываем состояние редактирования
        editingCardId = null;
        if (saveBtn) saveBtn.textContent = 'Сохранить';
    }

    // --- ГЛОБАЛЬНЫЕ ФУНКЦИИ ---
    window.editCard = function (cardId) {
        const card = userCards.find(c => c.id === cardId);
        if (!card) return;
        // Заполняем форму данными карточки
        if (educationLevel) educationLevel.value = card.educationLevel;
        if (educationStatus) educationStatus.value = card.educationStatus;
        if (description) description.value = card.description;
        selectedSkills = card.skills.map(skill => ({ value: skill.toLowerCase(), text: skill }));
        renderSelectedSkills();
        // Восстанавливаем файлы
        currentPhotoFile = card.photoFile;
        currentCvFile = card.cvFile;
        if (card.photoFile && profilePhoto) {
            const url = URL.createObjectURL(card.photoFile);
            currentPhotoUrl = url;
            profilePhoto.src = url;
            profilePhoto.style.display = 'block';
            const placeholder = document.querySelector('.image-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }
        if (card.cvFile && cvPreview) {
            const url = URL.createObjectURL(card.cvFile);
            currentCvUrl = url;
            cvPreview.innerHTML = `<a href="${url}" target="_blank"> ${card.cvFileName || 'Загруженное CV'}</a>`;
        }
        editingCardId = cardId; // ВАЖНО: устанавливаем перед сохранением
        if (saveBtn) saveBtn.textContent = 'Обновить';
        const profileForm = document.querySelector('.profile-form');
        if (profileForm) profileForm.scrollIntoView({ behavior: 'smooth' });
    };

    // УДАЛЕНИЕ КАРТОЧКИ С ОТПРАВКОЙ В БД
    window.deleteCard = async function (cardId) {
        if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;
        try {
            // 1. Удаляем карточку с сервера
            try {
                const deleteResponse = await fetch(`/users/${emailInput.value.trim()}/cards/${cardId}`, {
                    method: 'DELETE'
                });
                if (!deleteResponse.ok) {
                    const errText = await deleteResponse.text();
                    alert('Ошибка при удалении карточки: ' + errText);
                    return;
                }
            } catch (error) {
                alert('Ошибка при удалении карточки: ' + error.message);
                return;
            }
            // 2. Обновляем интерфейс
            await fetchUserCards();
        } catch (error) {
            alert('Ошибка при удалении карточки');
        }
    };

    window.downloadCV = async function (cardId) {
        const card = userCards.find(c => c.id === cardId);
        if (!card) {
            alert('Карточка не найдена');
            return;
        }
        if (card.cvFile) {
            // Старый способ (если файл уже в памяти)
            const url = URL.createObjectURL(card.cvFile);
            const link = document.createElement('a');
            link.href = url;
            link.download = card.cvFileName || 'CV.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
        }
        if (card.cvFileName) {
            // Новый способ — скачиваем с сервера
            try {
                const res = await fetch(`/users/cv/${emailInput.value.trim()}/${cardId}`);
                if (!res.ok) throw new Error('CV не найдено на сервере');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = card.cvFileName || 'CV.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (e) {
                alert('Ошибка при скачивании CV: ' + e.message);
            }
            return;
        }
        alert('CV не найдено для этой карточки. Загрузите CV через форму редактирования.');
    };

    window.clearAllData = function () {
        if (confirm('Вы уверены, что хотите удалить ВСЕ карточки? Это действие нельзя отменить!')) {
            userCards.forEach(card => {
                if (card.photoUrl) URL.revokeObjectURL(card.photoUrl);
                if (card.cvUrl) URL.revokeObjectURL(card.cvUrl);
            });
            userCards = [];
            clearLocalStorage();
            renderCards();
            alert('Все данные удалены!');
        }
    };

    // --- СОБЫТИЯ ---
    if (saveBtn) {
        saveBtn.addEventListener('click', function (e) {
            console.log('Нажата кнопка сохранения');
            e.preventDefault();
            createCard();
        });
    }
    if (addCvBtn) {
        addCvBtn.addEventListener('click', function (e) {
            console.log('Нажата кнопка добавления CV');
            e.preventDefault();
            clearForm();
            editingCardId = null;
            if (saveBtn) saveBtn.textContent = 'Сохранить';
            const profileForm = document.querySelector('.profile-form');
            if (profileForm) profileForm.scrollIntoView({ behavior: 'smooth' });
        });
    }
    if (uploadPhotoBtn && photoInput) {
        uploadPhotoBtn.addEventListener('click', () => photoInput.click());
    }
    if (uploadCvBtn && cvInput) {
        uploadCvBtn.addEventListener('click', () => cvInput.click());
    }
    if (photoInput) {
        photoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file && ["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Размер фото не должен превышать 5MB');
                    this.value = '';
                    return;
                }
                if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
                const url = URL.createObjectURL(file);
                currentPhotoUrl = url;
                currentPhotoFile = file;
                if (profilePhoto) {
                    profilePhoto.src = url;
                    profilePhoto.style.display = 'block';
                }
                const placeholder = document.querySelector('.image-placeholder');
                if (placeholder) placeholder.style.display = 'none';
            } else {
                alert('Пожалуйста, выберите файл изображения (PNG, JPEG или JPG)');
                this.value = '';
            }
        });
    }
    if (cvInput) {
        cvInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file && file.type === "application/pdf") {
                if (file.size > 10 * 1024 * 1024) {
                    alert('Размер CV не должен превышать 10MB');
                    this.value = '';
                    return;
                }
                if (currentCvUrl) URL.revokeObjectURL(currentCvUrl);
                const url = URL.createObjectURL(file);
                currentCvUrl = url;
                currentCvFile = file;
                if (cvPreview) {
                    cvPreview.innerHTML = `<a href="${url}" target="_blank">📄 ${file.name}</a>`;
                }
            } else {
                alert('Пожалуйста, выберите PDF файл');
                this.value = '';
            }
        });
    }
    // Удаляю обработчики input для имени и фамилии, а также автосохранение этих полей в localStorage

    // Автосохранение при закрытии страницы
    window.addEventListener('beforeunload', function () {
        saveToLocalStorage();
    });

    // Периодическое автосохранение каждые 30 секунд
    setInterval(function () {
        if (userCards.length > 0) {
            saveToLocalStorage();
        }
    }, 30000);

    console.log('Инициализация завершена успешно');
});
