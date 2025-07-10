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

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function base64ToFile(base64, filename, mimeType) {
        try {
            const arr = base64.split(',');
            const mime = mimeType || arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            return new File([u8arr], filename || 'file', { type: mime });
        } catch (error) {
            return null;
        }
    }

    async function saveToLocalStorage() {
        if (!checkLocalStorageSupport()) return;
        try {
            const cardsToSave = [];
            for (const card of userCards) {
                const cardToSave = { ...card };
                if (card.photoFile) {
                    cardToSave.photoBase64 = await fileToBase64(card.photoFile);
                    cardToSave.photoMimeType = card.photoFile.type;
                }
                if (card.cvFile) {
                    cardToSave.cvBase64 = await fileToBase64(card.cvFile);
                    cardToSave.cvMimeType = card.cvFile.type;
                }
                delete cardToSave.photoFile;
                delete cardToSave.cvFile;
                delete cardToSave.photoUrl;
                delete cardToSave.cvUrl;
                cardsToSave.push(cardToSave);
            }
            localStorage.setItem('userCards', JSON.stringify(cardsToSave));
        } catch (error) {}
    }

    function loadFromLocalStorage() {
        if (!checkLocalStorageSupport()) return;
        try {
            const savedCards = localStorage.getItem('userCards');
            if (savedCards) {
                const parsedCards = JSON.parse(savedCards);
                userCards = parsedCards.map(card => {
                    if (card.photoBase64 && card.photoFileName) {
                        const photoFile = base64ToFile(card.photoBase64, card.photoFileName, card.photoMimeType || 'image/jpeg');
                        if (photoFile) {
                            card.photoFile = photoFile;
                            card.photoUrl = URL.createObjectURL(photoFile);
                        }
                    }
                    if (card.cvBase64 && card.cvFileName) {
                        const cvFile = base64ToFile(card.cvBase64, card.cvFileName, card.cvMimeType || 'application/pdf');
                        if (cvFile) {
                            card.cvFile = cvFile;
                            card.cvUrl = URL.createObjectURL(cvFile);
                        }
                    }
                    delete card.photoBase64;
                    delete card.cvBase64;
                    delete card.photoMimeType;
                    delete card.cvMimeType;
                    return card;
                });
            }
            renderCards();
        } catch (error) {
            userCards = [];
            renderCards();
        }
    }

    function clearLocalStorage() {
        if (!checkLocalStorageSupport()) return;
        userCards.forEach(card => {
            if (card.photoUrl) URL.revokeObjectURL(card.photoUrl);
            if (card.cvUrl) URL.revokeObjectURL(card.cvUrl);
        });
        localStorage.removeItem('userCards');
    }

    // --- ИНИЦИАЛИЗАЦИЯ ---
    if (emailInput) emailInput.value = localStorage.getItem('userEmail') || 'kycenbka@gmail.com';
    if (nameInputs[0]) nameInputs[0].value = localStorage.getItem('userName') || '';
    if (nameInputs[1]) nameInputs[1].value = localStorage.getItem('userSurname') || '';
    loadFromLocalStorage();

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
            btn.addEventListener('click', function() {
                removeSkill(this.getAttribute('data-skill'));
            });
        });
    }

    // --- СОЗДАНИЕ/ОБНОВЛЕНИЕ КАРТОЧКИ С ОТПРАВКОЙ В БД ---
    async function createCard() {
        try {
            const name = nameInputs[0]?.value.trim() || 'Имя';
            const surname = nameInputs[1]?.value.trim() || 'Фамилия';
            const eduLevel = educationLevel?.value || 'Не указано';
            const eduStatus = educationStatus?.value || 'Не указано';
            const desc = description?.value.trim() || 'Описание не указано';
            const skills = selectedSkills.map(skill => skill.text);
            const email = emailInput.value;

            if (!email) {
                alert('Пожалуйста, укажите email');
                return;
            }

            let cardId;
            let isNewCard = !editingCardId;

            if (editingCardId) {
                // РЕЖИМ РЕДАКТИРОВАНИЯ
                cardId = editingCardId;

                // 1. Обновляем данные карточки на сервере
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

                    if (updateResponse.ok) {
                        console.log('Карточка успешно обновлена на сервере');
                    } else {
                        console.warn('Ошибка при обновлении карточки на сервере');
                    }
                } catch (error) {
                    console.warn('Ошибка при обновлении карточки:', error);
                }

                // Обновляем локальную карточку
                const cardIndex = userCards.findIndex(card => card.id === editingCardId);
                if (cardIndex !== -1) {
                    const existingCard = userCards[cardIndex];
                    userCards[cardIndex] = {
                        ...existingCard,
                        name,
                        surname,
                        educationLevel: eduLevel,
                        educationStatus: eduStatus,
                        description: desc,
                        skills,
                        photoFile: currentPhotoFile || existingCard.photoFile,
                        cvFile: currentCvFile || existingCard.cvFile,
                        photoFileName: currentPhotoFile ? currentPhotoFile.name : existingCard.photoFileName,
                        cvFileName: currentCvFile ? currentCvFile.name : existingCard.cvFileName,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // РЕЖИМ СОЗДАНИЯ

                // 1. Создаем карточку на сервере
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

                    if (createResponse.ok) {
                        const createData = await createResponse.json();
                        // КЛЮЧЕВОЙ МОМЕНТ: получаем card_id из ответа сервера
                        cardId = createData.card_id;
                        console.log('Карточка создана на сервере с ID:', cardId);

                        if (!cardId) {
                            throw new Error('Сервер не вернул card_id');
                        }
                    } else {
                        throw new Error('Ошибка при создании карточки на сервере');
                    }
                } catch (error) {
                    console.error('Ошибка создания карточки:', error);
                    // Используем временный ID для локального хранения
                    cardId = Date.now();
                    console.warn('Используем временный ID для локального хранения:', cardId);
                }

                // Добавляем новую карточку в локальный массив
                userCards.push({
                    id: cardId,
                    name,
                    surname,
                    educationLevel: eduLevel,
                    educationStatus: eduStatus,
                    description: desc,
                    skills,
                    photoFile: currentPhotoFile,
                    cvFile: currentCvFile,
                    photoFileName: currentPhotoFile ? currentPhotoFile.name : null,
                    cvFileName: currentCvFile ? currentCvFile.name : null,
                    createdAt: new Date().toISOString()
                });
            }

            // 2. Загружаем файлы на сервер (только если есть новые файлы)
            if (currentCvFile && cardId) {
                try {
                    const formData = new FormData();
                    formData.append('email', email);
                    formData.append('pdf_file', currentCvFile);

                    const cvResponse = await fetch(`/users/cv/${email}/${cardId}`, {
                        method: 'POST',
                        body: formData
                    });

                    if (cvResponse.ok) {
                        console.log('CV успешно загружено на сервер');
                    } else {
                        console.warn('Ошибка при загрузке CV на сервер');
                    }
                } catch (error) {
                    console.warn('Ошибка при загрузке CV:', error);
                }
            }

            if (currentPhotoFile && cardId) {
                try {
                    const formData = new FormData();
                    formData.append('email', email);
                    formData.append('photo', currentPhotoFile);

                    const photoResponse = await fetch(`/users/photo/${email}/${cardId}`, {
                        method: 'POST',
                        body: formData
                    });

                    if (photoResponse.ok) {
                        console.log('Фото успешно загружено на сервер');
                    } else {
                        console.warn('Ошибка при загрузке фото на сервер');
                    }
                } catch (error) {
                    console.warn('Ошибка при загрузке фото:', error);
                }
            }

            // 3. Обновляем интерфейс
            renderCards();
            clearForm();
            await saveToLocalStorage();

            const message = isNewCard ? 'Карточка успешно создана и сохранена в БД!' : 'Карточка успешно обновлена в БД!';
            alert(message);

        } catch (error) {
            console.error('Ошибка при создании/обновлении карточки:', error);
            alert('Ошибка при сохранении карточки: ' + error.message);
        }
    }

    function renderCards() {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';
        if (userCards.length === 0) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Карточки не найдены. Создайте первую карточку!</p>';
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
        if (cardData.photoFile) {
            const url = URL.createObjectURL(cardData.photoFile);
            photoContent = `<img src="${url}" alt="Photo" 
                            style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
                            onerror="this.style.display='none'; this.parentElement.innerHTML='Ошибка загрузки фото';">`;
        }
        const cvButtonText = cardData.cvFile ? 'Скачать CV' : 'CV отсутствует';
        const cvButtonDisabled = cardData.cvFile ? '' : 'disabled';
        cardDiv.innerHTML = `
            <div class="card-header">
                <div class="logo-place">
                    ${photoContent}
                </div>
                <div class="job-title-info">
                    <h2>${cardData.name}</h2>
                    <h2>${cardData.surname}</h2>
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
                    📷 ${cardData.photoFileName || 'Фото не загружено'} | 
                    📄 ${cardData.cvFileName || 'CV не загружено'}
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
    window.editCard = function(cardId) {
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
            cvPreview.innerHTML = `<a href="${url}" target="_blank">📄 ${card.cvFileName || 'Загруженное CV'}</a>`;
        }

        editingCardId = cardId;
        if (saveBtn) saveBtn.textContent = 'Обновить';

        const profileForm = document.querySelector('.profile-form');
        if (profileForm) profileForm.scrollIntoView({ behavior: 'smooth' });
    };

    // УДАЛЕНИЕ КАРТОЧКИ С ОТПРАВКОЙ В БД
    window.deleteCard = async function(cardId) {
        if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

        try {
            // 1. Удаляем карточку с сервера
            try {
                const deleteResponse = await fetch(`/users/${emailInput.value}/cards/${cardId}`, {
                    method: 'DELETE'
                });

                if (deleteResponse.ok) {
                    console.log('Карточка успешно удалена с сервера');
                } else {
                    console.warn('Ошибка при удалении карточки с сервера');
                }
            } catch (error) {
                console.warn('Ошибка при удалении карточки с сервера:', error);
            }

            // 2. Удаляем карточку из локального хранения
            const cardToDelete = userCards.find(card => card.id === cardId);
            if (cardToDelete) {
                if (cardToDelete.photoUrl) URL.revokeObjectURL(cardToDelete.photoUrl);
                if (cardToDelete.cvUrl) URL.revokeObjectURL(cardToDelete.cvUrl);
            }

            userCards = userCards.filter(card => card.id !== cardId);

            // 3. Обновляем интерфейс
            renderCards();
            await saveToLocalStorage();

            alert('Карточка удалена из БД!');
        } catch (error) {
            console.error('Ошибка при удалении карточки:', error);
            alert('Ошибка при удалении карточки');
        }
    };

    window.downloadCV = function(cardId) {
        const card = userCards.find(c => c.id === cardId);
        if (!card) {
            alert('Карточка не найдена');
            return;
        }
        if (!card.cvFile) {
            alert('CV не найдено для этой карточки. Загрузите CV через форму редактирования.');
            return;
        }
        const url = URL.createObjectURL(card.cvFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = card.cvFileName || 'CV.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    window.clearAllData = function() {
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
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createCard();
        });
    }
    if (addCvBtn) {
        addCvBtn.addEventListener('click', function(e) {
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
        photoInput.addEventListener('change', function() {
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
        cvInput.addEventListener('change', function() {
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
    if (nameInputs[0]) {
        nameInputs[0].addEventListener('input', function() {
            localStorage.setItem('userName', this.value);
        });
    }
    if (nameInputs[1]) {
        nameInputs[1].addEventListener('input', function() {
            localStorage.setItem('userSurname', this.value);
        });
    }
    window.addEventListener('beforeunload', function() {
        saveToLocalStorage();
    });
    setInterval(function() {
        if (userCards.length > 0) saveToLocalStorage();
    }, 30000);
});
