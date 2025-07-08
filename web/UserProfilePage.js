document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM загружен, начинаем инициализацию...');

    // Элементы для работы с навыками
    const skillsSearch = document.getElementById('skillsSearch');
    const skillsDropdown = document.getElementById('skillsDropdown');
    const selectedSkillsContainer = document.getElementById('selectedSkills');

    // Проверяем существование ключевых элементов
    if (!skillsSearch) {
        console.error('Элемент skillsSearch не найден!');
        return;
    }
    if (!skillsDropdown) {
        console.error('Элемент skillsDropdown не найден!');
        return;
    }
    if (!selectedSkillsContainer) {
        console.error('Элемент selectedSkills не найден!');
        return;
    }

    const skillsInputWrapper = skillsSearch.parentElement;

    // Элементы формы
    const emailInput = document.querySelector('.email-input');
    const nameInputs = document.querySelectorAll('.name-input');
    const educationLevel = document.getElementById('educationLevel');
    const educationStatus = document.getElementById('educationStatus');
    const description = document.getElementById('description');
    const saveBtn = document.getElementById('saveBtn');
    const addCvBtn = document.getElementById('addCvBtn');
    const cardsContainer = document.getElementById('cardsContainer');

    // Проверяем критически важные элементы
    if (!saveBtn) {
        console.error('Кнопка saveBtn не найдена!');
        return;
    }
    if (!cardsContainer) {
        console.error('Контейнер cardsContainer не найден!');
        return;
    }

    console.log('Все основные элементы найдены успешно');

    // Элементы для файлов
    const photoInput = document.getElementById('photoInput');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const cvInput = document.getElementById('cvInput');
    const uploadCvBtn = document.getElementById('uploadCvBtn');
    const profilePhoto = document.getElementById('profilePhoto');
    const cvPreview = document.getElementById('cvPreview');

    // Переменные состояния
    let selectedSkills = [];
    let userCards = [];
    let nextCardId = 1;
    let editingCardId = null;
    let currentPhotoUrl = null;
    let currentCvUrl = null;
    let currentPhotoFile = null;
    let currentCvFile = null;

    // Функция для проверки поддержки localStorage
    function checkLocalStorageSupport() {
        try {
            const testKey = 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('localStorage не поддерживается:', error);
            return false;
        }
    }

    // Функция для конвертации файла в Base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Функция для создания файла из Base64
    function base64ToFile(base64, filename, mimeType) {
        try {
            const arr = base64.split(',');
            const mime = mimeType || arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename || 'file', { type: mime });
        } catch (error) {
            console.error('Ошибка при создании файла из Base64:', error);
            return null;
        }
    }

    // **ФУНКЦИИ ДЛЯ РАБОТЫ С LOCALSTORAGE**
    async function saveToLocalStorage() {
        if (!checkLocalStorageSupport()) return;

        try {
            const cardsToSave = [];
            let totalSize = 0;

            for (const card of userCards) {
                const cardToSave = { ...card };

                // Конвертируем фото в Base64
                if (card.photoFile) {
                    const photoBase64 = await fileToBase64(card.photoFile);
                    const photoSize = photoBase64.length;

                    if (photoSize > 1024 * 1024) { // 1MB лимит для фото
                        console.warn('Фото слишком большое, пропускаем:', card.photoFileName);
                    } else {
                        cardToSave.photoBase64 = photoBase64;
                        cardToSave.photoMimeType = card.photoFile.type;
                        totalSize += photoSize;
                    }
                }

                // Конвертируем CV в Base64
                if (card.cvFile) {
                    const cvBase64 = await fileToBase64(card.cvFile);
                    const cvSize = cvBase64.length;

                    if (cvSize > 2 * 1024 * 1024) { // 2MB лимит для CV
                        console.warn('CV слишком большое, пропускаем:', card.cvFileName);
                    } else {
                        cardToSave.cvBase64 = cvBase64;
                        cardToSave.cvMimeType = card.cvFile.type;
                        totalSize += cvSize;
                    }
                }

                // Удаляем объекты File и URL
                delete cardToSave.photoFile;
                delete cardToSave.cvFile;
                delete cardToSave.photoUrl;
                delete cardToSave.cvUrl;

                cardsToSave.push(cardToSave);
            }

            // Проверяем общий размер
            if (totalSize > 5 * 1024 * 1024) { // 5MB общий лимит
                console.warn('Общий размер данных превышает лимит localStorage');
            }

            localStorage.setItem('userCards', JSON.stringify(cardsToSave));
            localStorage.setItem('nextCardId', nextCardId.toString());
            console.log('Данные сохранены в localStorage, размер:', totalSize);
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Недостаточно места в localStorage. Попробуйте удалить некоторые карточки.');
            }
        }
    }

    function loadFromLocalStorage() {
        if (!checkLocalStorageSupport()) return;

        try {
            const savedCards = localStorage.getItem('userCards');
            if (savedCards) {
                const parsedCards = JSON.parse(savedCards);

                userCards = parsedCards.map(card => {
                    // Восстанавливаем файлы из Base64 с проверками
                    if (card.photoBase64 && card.photoFileName) {
                        const photoFile = base64ToFile(
                            card.photoBase64,
                            card.photoFileName,
                            card.photoMimeType || 'image/jpeg'
                        );
                        if (photoFile) {
                            card.photoFile = photoFile;
                            card.photoUrl = URL.createObjectURL(photoFile);
                        }
                    }

                    if (card.cvBase64 && card.cvFileName) {
                        const cvFile = base64ToFile(
                            card.cvBase64,
                            card.cvFileName,
                            card.cvMimeType || 'application/pdf'
                        );
                        if (cvFile) {
                            card.cvFile = cvFile;
                            card.cvUrl = URL.createObjectURL(cvFile);
                        }
                    }

                    // Удаляем Base64 данные (они больше не нужны)
                    delete card.photoBase64;
                    delete card.cvBase64;
                    delete card.photoMimeType;
                    delete card.cvMimeType;

                    return card;
                });

                console.log('Загружено карточек:', userCards.length);
            }

            const savedNextId = localStorage.getItem('nextCardId');
            if (savedNextId) {
                nextCardId = parseInt(savedNextId);
            }

            renderCards();
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            userCards = [];
            nextCardId = 1;
            renderCards();
        }
    }

    function clearLocalStorage() {
        if (!checkLocalStorageSupport()) return;

        // Освобождаем URL объекты перед очисткой
        userCards.forEach(card => {
            if (card.photoUrl) URL.revokeObjectURL(card.photoUrl);
            if (card.cvUrl) URL.revokeObjectURL(card.cvUrl);
        });

        localStorage.removeItem('userCards');
        localStorage.removeItem('nextCardId');
        console.log('localStorage очищен');
    }

    // Проверяем поддержку localStorage при инициализации
    if (!checkLocalStorageSupport()) {
        alert('Ваш браузер не поддерживает localStorage. Данные не будут сохраняться.');
    }

    // Инициализация
    const email = getUserEmail();
    if (emailInput && email) emailInput.value = email;

    // Загружаем имя и фамилию из localStorage
    if (nameInputs[0]) nameInputs[0].value = localStorage.getItem('userName') || '';
    if (nameInputs[1]) nameInputs[1].value = localStorage.getItem('userSurname') || '';

    // Загружаем сохраненные карточки
    loadFromLocalStorage();

    function getUserEmail() {
        return "a.ilin@innopolis.university"; // временно
    }

    // **ФУНКЦИИ ДЛЯ РАБОТЫ С НАВЫКАМИ**

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
        if (skillsDropdown.classList.contains('show')) {
            hideDropdown();
        } else {
            showDropdown();
        }
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
        console.log('Навык добавлен:', text);
    }

    function removeSkill(value) {
        selectedSkills = selectedSkills.filter(skill => skill.value !== value);
        renderSelectedSkills();
        console.log('Навык удален:', value);
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

        // Добавляем обработчики для кнопок удаления
        selectedSkillsContainer.querySelectorAll('.skill-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                removeSkill(this.getAttribute('data-skill'));
            });
        });
    }

    // **ФУНКЦИИ ДЛЯ РАБОТЫ С КАРТОЧКАМИ**

    async function createCard() {
        console.log('Создание карточки...');

        const name = nameInputs[0]?.value.trim() || 'Имя';
        const surname = nameInputs[1]?.value.trim() || 'Фамилия';
        const eduLevel = educationLevel?.value || 'Не указано';
        const eduStatus = educationStatus?.value || 'Не указано';
        const desc = description?.value.trim() || 'Описание не указано';
        const skills = selectedSkills.map(skill => skill.text);

        const cardData = {
            id: editingCardId || nextCardId++,
            name,
            surname,
            educationLevel: eduLevel,
            educationStatus: eduStatus,
            description: desc,
            skills,
            photoUrl: currentPhotoUrl,
            cvUrl: currentCvUrl,
            photoFile: currentPhotoFile,
            cvFile: currentCvFile,
            photoFileName: currentPhotoFile ? currentPhotoFile.name : null,
            cvFileName: currentCvFile ? currentCvFile.name : null,
            createdAt: new Date().toISOString()
        };

        console.log('Данные карточки:', cardData);

        if (editingCardId) {
            // Обновляем существующую карточку
            const cardIndex = userCards.findIndex(card => card.id === editingCardId);
            if (cardIndex !== -1) {
                const oldCard = userCards[cardIndex];
                cardData.photoUrl = currentPhotoUrl || oldCard.photoUrl;
                cardData.cvUrl = currentCvUrl || oldCard.cvUrl;
                cardData.photoFile = currentPhotoFile || oldCard.photoFile;
                cardData.cvFile = currentCvFile || oldCard.cvFile;
                cardData.photoFileName = currentPhotoFile ? currentPhotoFile.name : oldCard.photoFileName;
                cardData.cvFileName = currentCvFile ? currentCvFile.name : oldCard.cvFileName;
                cardData.createdAt = oldCard.createdAt;
                cardData.updatedAt = new Date().toISOString();

                userCards[cardIndex] = cardData;
            }
            editingCardId = null;
            if (saveBtn) saveBtn.textContent = 'Сохранить';
        } else {
            userCards.push(cardData);
        }

        renderCards();
        clearForm();
        await saveToLocalStorage();
    }

    function renderCards() {
        if (!cardsContainer) {
            console.error('Контейнер для карточек не найден!');
            return;
        }

        console.log('Отрисовка карточек, количество:', userCards.length);
        cardsContainer.innerHTML = '';

        if (userCards.length === 0) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Карточки не найдены. Создайте первую карточку!</p>';
            return;
        }

        userCards.forEach(card => {
            const cardElement = createCardElement(card);
            cardsContainer.appendChild(cardElement);
        });

        console.log('Карточки отрисованы успешно');
    }

    function createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'cv-card';
        cardDiv.setAttribute('data-card-id', cardData.id);

        const skillsHTML = cardData.skills.map(skill =>
            `<div class="cv-skill-tag">${skill}</div>`
        ).join('');

        // Определяем содержимое для фото с обработкой ошибок
        let photoContent = 'Фото';
        if (cardData.photoUrl) {
            photoContent = `<img src="${cardData.photoUrl}" alt="Photo" 
                            style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
                            onerror="this.style.display='none'; this.parentElement.innerHTML='Ошибка загрузки фото';">`;
        }

        // Определяем статус CV
        const cvButtonText = cardData.cvUrl ? 'Скачать CV' : 'CV отсутствует';
        const cvButtonDisabled = cardData.cvUrl ? '' : 'disabled';


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
        if (educationLevel) educationLevel.value = '';
        if (educationStatus) educationStatus.value = '';
        if (description) description.value = '';
        selectedSkills = [];
        renderSelectedSkills();

        // Очищаем текущие файлы
        if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
        if (currentCvUrl) URL.revokeObjectURL(currentCvUrl);

        currentPhotoUrl = null;
        currentCvUrl = null;
        currentPhotoFile = null;
        currentCvFile = null;

        // Сбрасываем отображение файлов
        if (profilePhoto) {
            profilePhoto.style.display = 'none';
            profilePhoto.src = '';
        }
        const placeholder = document.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        if (cvPreview) {
            cvPreview.innerHTML = '';
        }

        // Очищаем input файлов
        if (photoInput) photoInput.value = '';
        if (cvInput) cvInput.value = '';
    }

    // Глобальные функции для кнопок карточек
    window.editCard = function(cardId) {
        console.log('Редактирование карточки:', cardId);
        const card = userCards.find(c => c.id === cardId);
        if (!card) return;

        // Заполняем форму данными карточки
        if (educationLevel) educationLevel.value = card.educationLevel;
        if (educationStatus) educationStatus.value = card.educationStatus;
        if (description) description.value = card.description;
        selectedSkills = card.skills.map(skill => ({ value: skill.toLowerCase(), text: skill }));
        renderSelectedSkills();

        // Восстанавливаем файлы
        currentPhotoUrl = card.photoUrl;
        currentCvUrl = card.cvUrl;
        currentPhotoFile = card.photoFile;
        currentCvFile = card.cvFile;

        // Отображаем фото если есть
        if (card.photoUrl && profilePhoto) {
            profilePhoto.src = card.photoUrl;
            profilePhoto.style.display = 'block';
            const placeholder = document.querySelector('.image-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }

        // Отображаем CV если есть
        if (card.cvUrl && cvPreview) {
            cvPreview.innerHTML = `<a href="${card.cvUrl}" target="_blank">📄 ${card.cvFileName || 'Загруженное CV'}</a>`;
        }

        editingCardId = cardId;
        if (saveBtn) saveBtn.textContent = 'Обновить';

        // Прокручиваем к форме
        const profileForm = document.querySelector('.profile-form');
        if (profileForm) {
            profileForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteCard = async function(cardId) {
        console.log('Удаление карточки:', cardId);
        if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

        // Освобождаем URL объекты для предотвращения утечек памяти
        const cardToDelete = userCards.find(card => card.id === cardId);
        if (cardToDelete) {
            if (cardToDelete.photoUrl) URL.revokeObjectURL(cardToDelete.photoUrl);
            if (cardToDelete.cvUrl) URL.revokeObjectURL(cardToDelete.cvUrl);
        }

        userCards = userCards.filter(card => card.id !== cardId);
        renderCards();
        await saveToLocalStorage();
    };

    window.downloadCV = function(cardId) {
        console.log('Скачивание CV для карточки:', cardId);
        const card = userCards.find(c => c.id === cardId);
        if (!card) {
            alert('Карточка не найдена');
            return;
        }
        if (!card.cvUrl) {
            alert('CV не найдено для этой карточки. Загрузите CV через форму редактирования.');
            return;
        }

        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = card.cvUrl;
        link.download = card.cvFileName || 'CV.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Функция для очистки всех данных
    window.clearAllData = function() {
        if (confirm('Вы уверены, что хотите удалить ВСЕ карточки? Это действие нельзя отменить!')) {
            userCards.forEach(card => {
                if (card.photoUrl) URL.revokeObjectURL(card.photoUrl);
                if (card.cvUrl) URL.revokeObjectURL(card.cvUrl);
            });
            userCards = [];
            nextCardId = 1;
            clearLocalStorage();
            renderCards();
            alert('Все данные удалены!');
        }
    };

    // **ОБРАБОТЧИКИ СОБЫТИЙ**

    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            console.log('Нажата кнопка сохранения');
            e.preventDefault();
            createCard();
        });
    }

    if (addCvBtn) {
        addCvBtn.addEventListener('click', function(e) {
            console.log('Нажата кнопка добавления CV');
            e.preventDefault();
            clearForm();
            editingCardId = null;
            if (saveBtn) saveBtn.textContent = 'Сохранить';
            const profileForm = document.querySelector('.profile-form');
            if (profileForm) {
                profileForm.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Обработчики для загрузки файлов
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
                // Проверяем размер файла (максимум 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Размер фото не должен превышать 5MB');
                    this.value = '';
                    return;
                }

                // Освобождаем предыдущий URL если был
                if (currentPhotoUrl) {
                    URL.revokeObjectURL(currentPhotoUrl);
                }

                const url = URL.createObjectURL(file);
                currentPhotoUrl = url;
                currentPhotoFile = file;

                if (profilePhoto) {
                    profilePhoto.src = url;
                    profilePhoto.style.display = 'block';
                }
                const placeholder = document.querySelector('.image-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }

                console.log('Фото загружено:', file.name);
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
                // Проверяем размер файла (максимум 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert('Размер CV не должен превышать 10MB');
                    this.value = '';
                    return;
                }

                if (currentCvUrl) {
                    URL.revokeObjectURL(currentCvUrl);
                }

                const url = URL.createObjectURL(file);
                currentCvUrl = url;
                currentCvFile = file;

                if (cvPreview) {
                    cvPreview.innerHTML = `<a href="${url}" target="_blank">📄 ${file.name}</a>`;
                }

                console.log('CV загружено:', file.name);
            } else {
                alert('Пожалуйста, выберите PDF файл');
                this.value = '';
            }
        });
    }

    // Сохранение имени и фамилии в localStorage при изменении
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

    // Автосохранение при закрытии страницы
    window.addEventListener('beforeunload', function() {
        saveToLocalStorage();
    });

    // Периодическое автосохранение каждые 30 секунд
    setInterval(function() {
        if (userCards.length > 0) {
            saveToLocalStorage();
        }
    }, 30000);

    console.log('Инициализация завершена успешно');
});
