document.addEventListener('DOMContentLoaded', function () {
    if (!localStorage.getItem('userEmail')) {
        window.location.href = '/log_in_page';
    }
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
            const res = await fetch(`/users/${encodeURIComponent(email)}/name`);
            if (!res.ok) return { name: '', surname: '' };
            const data = await res.json();
            if (data.name) {
                const [firstName, ...rest] = data.name.split(' ');
                return { name: firstName || '', surname: rest.join(' ') || '' };
            } else {
                return { name: '', surname: '' };
            }
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
            if (nameInputs[0]) nameInputs[0].setAttribute('readonly', true);
            if (nameInputs[1]) nameInputs[1].setAttribute('readonly', true);
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
                    photoUrl,
                    cvFile: null,
                    photoFileName: card.photo_name,
                    cvFileName: card.cv_name,
                    createdAt: null
                };
            }));
        } catch (error) {
            userCards = [];
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
    async function saveCard() {
        try {
            const eduLevel = educationLevel?.value || '';
            const eduStatus = educationStatus?.value || '';
            const desc = description?.value || '';
            const isEditing = editingCardId !== null;

            const cardBeingEdited = isEditing ? userCards.find(c => c.id === editingCardId) : null;

            let missingFields = [];
            if (!eduLevel) missingFields.push("Уровень образования");
            if (!eduStatus) missingFields.push("Статус образования");
            if (!desc) missingFields.push("Описание");
            if (selectedSkills.length === 0) missingFields.push("Навыки");
            if (!currentPhotoFile && !(isEditing && cardBeingEdited?.photoFileName)) {
                missingFields.push("Фото");
            }
            if (!currentCvFile && !(isEditing && cardBeingEdited?.cvFileName)) {
                missingFields.push("Файл CV");
            }

            if (missingFields.length > 0) {
                alert(`Пожалуйста, заполните все обязательные поля: ${missingFields.join(', ')}.`);
                return;
            }

            const email = emailInput.value.trim();
            if (!email) {
                alert('Email пользователя не найден.');
                return;
            }

            const url = isEditing ? `/users/${email}/cards/${editingCardId}` : `/users/${email}/cards`;
            const method = isEditing ? 'PATCH' : 'POST';

            const cardData = {
                education_level: eduLevel,
                education_full: eduStatus,
                description: desc,
                skills: selectedSkills.map(s => s.value),
                age: 0
            };

            const cardResponse = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardData)
            });

            if (!cardResponse.ok) {
                const errorData = await cardResponse.json().catch(() => ({ detail: 'Не удалось сохранить карточку.' }));
                throw new Error(errorData.detail);
            }

            const cardResult = await cardResponse.json();
            const cardId = isEditing ? editingCardId : cardResult.card_id;

            if (currentPhotoFile) {
                const photoFormData = new FormData();
                photoFormData.append('email', email);
                photoFormData.append('photo', currentPhotoFile);
                const photoResponse = await fetch(`/users/photo/${email}/${cardId}`, {
                    method: 'POST',
                    body: photoFormData
                });

                if (!photoResponse.ok) {
                    alert('Карточка сохранена, но не удалось загрузить фото.');
                }
            }

            if (currentCvFile) {
                const cvFormData = new FormData();
                cvFormData.append('email', email);
                cvFormData.append('pdf_file', currentCvFile);
                const cvResponse = await fetch(`/users/cv/${email}/${cardId}`, {
                    method: 'POST',
                    body: cvFormData
                });
                if (!cvResponse.ok) {
                    alert('Карточка сохранена, но не удалось загрузить CV.');
                }
            }

            await fetchUserCards();
            clearForm();

        } catch (error) {
            alert(`Ошибка при сохранении карточки: ${error.message}`);
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
            <div class="buttoms">
                <div class="cv-buttons-row">
                    <button class="apply-button" onclick="downloadCV(${cardData.id})" ${cvButtonDisabled}>${cvButtonText}</button>
                    <button class="apply-button" onclick="editCard(${cardData.id})">Редактировать</button>
                </div>
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
            saveCard();
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
