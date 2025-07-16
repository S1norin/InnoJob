import { SERVER_URL } from "/web/config.js";

document.addEventListener('DOMContentLoaded', () => {
    const app = {
        elements: {},
        allCVs: [],
        currentPage: 1,
        itemsPerPage: 6,
        searchTerm: '',
        filters: {
            skills: new Set(),
            education_level: new Set(),
            education_full: new Set(),
        },

        init() {
            this.cacheDOMElements();
            this.bindEvents();
            // Восстановление страницы из localStorage
            const savedPage = parseInt(localStorage.getItem('mainCVCurrentPage'), 10);
            if (!isNaN(savedPage) && savedPage > 0) {
                this.currentPage = savedPage;
            }
            this.fetchAndRenderCVs();
            this.bindSearchEvents();
            this.bindFilterEvents();
        },

        cacheDOMElements() {
            this.elements.vacanciesList = document.getElementById('vacancies-list');
            this.elements.pagination = document.getElementById('pagination');
            this.elements.allJobsText = document.querySelector('.all_jobs_text p');
            this.elements.filterContainer = document.querySelector('.filters-conteiner');
            this.elements.clearFiltersBtn = document.getElementById('clear-filters');
            this.elements.searchInput = document.getElementById('search-input');
        },

        bindEvents() {
            if (this.elements.pagination) {
                this.elements.pagination.addEventListener('click', (e) => {
                    if (e.target.matches('.page-btn') || e.target.matches('.arrow-btn')) {
                        const page = parseInt(e.target.dataset.page, 10);
                        if (!isNaN(page) && page !== this.currentPage && !e.target.disabled) {
                            this.currentPage = page;
                            this.renderCVs();
                            localStorage.setItem('mainCVCurrentPage', this.currentPage);
                        }
                    }
                });
            }
            // Download and contact buttons
            this.elements.vacanciesList.addEventListener('click', (e) => {
                if (e.target.matches('.apply-button') && e.target.textContent.includes('Скачать CV')) {
                    const cardIdx = e.target.closest('.cv-card').dataset.idx;
                    const card = this.filteredCVs()[cardIdx];
                    if (card && card.cvFileName && card.user_email && card.card_id) {
                        const url = `${SERVER_URL}/users/cv/${encodeURIComponent(card.user_email)}/${card.card_id}`;
                        window.open(url, '_blank');
                    }
                } else if (e.target.matches('.apply-button') && e.target.textContent.includes('Связаться')) {
                    const cardIdx = e.target.closest('.cv-card').dataset.idx;
                    const card = this.filteredCVs()[cardIdx];
                    if (card && card.user_email) {
                        window.location.href = `mailto:${card.user_email}`;
                    }
                }
            });
        },

        async fetchAndRenderCVs() {
            this.setUIState('loading');
            try {
                const response = await fetch(`${SERVER_URL}/cv_listing`);
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                const cards = await response.json();
                // Map backend fields to frontend card structure
                this.allCVs = cards.map(card => ({
                    name: card.name || '',
                    surname: card.surname || '',
                    email: card.email || '',
                    education_level: card.education_level || '',
                    education_full: card.education_full || '',
                    description: card.description || '',
                    skills: card.skills || [],
                    photoFileName: card.photo_name || '',
                    cvFileName: `${SERVER_URL}/users/cv/${card.email}/${card.card_id}` || '',
                    photoUrl: `${SERVER_URL}/users/photo/${card.email}/${card.card_id}` || '',
                    user_email: card.email || '',
                    card_id: card.card_id,
                }));
                this.populateFilters();
                this.renderCVs();
            } catch (error) {
                console.error('Ошибка при загрузке списка резюме:', error);
                this.setUIState('error', `Не удалось загрузить список резюме. Детали: ${error.message}`);
            }
        },

        populateFilters() {
            const skillsSet = new Set();
            const educationLevelSet = new Set();
            const educationFullSet = new Set();
            this.allCVs.forEach(card => {
                if (card.skills) card.skills.forEach(skill => skillsSet.add(skill));
                if (card.education_level) educationLevelSet.add(card.education_level);
                if (card.education_full) educationFullSet.add(card.education_full);
            });
            const sections = document.querySelectorAll('.filter_section');
            sections.forEach(section => {
                const header = section.querySelector('h2').textContent.toLowerCase();
                const variantsContainer = section.querySelector('.filter_variants');
                if (header.includes('навыки') || header.includes('skills')) {
                    this.createSkillFilter(variantsContainer, skillsSet);
                } else if (header.includes('уровень')) {
                    this.createCheckboxes(variantsContainer, educationLevelSet, 'education_level');
                } else if (header.includes('статус')) {
                    this.createCheckboxes(variantsContainer, educationFullSet, 'education_full');
                }
            });
        },

        createSkillFilter(container, skillsSet) {
            container.innerHTML = '';
            // Search input
            const searchWrapper = document.createElement('div');
            searchWrapper.className = 'city-search-wrapper';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Поиск навыков...';
            searchInput.className = 'city-search-input';
            searchWrapper.appendChild(searchInput);
            container.appendChild(searchWrapper);
            // Skills container
            const skillsContainer = document.createElement('div');
            skillsContainer.className = 'skills-container';
            container.appendChild(skillsContainer);
            const sortedSkills = Array.from(skillsSet).sort();
            const renderSkills = (filteredSkills = sortedSkills) => {
                skillsContainer.innerHTML = '';
                filteredSkills.forEach(skill => {
                    const label = document.createElement('label');
                    label.className = 'checkbox-label';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = skill;
                    checkbox.addEventListener('change', (e) => {
                        this.toggleFilter(this.filters.skills, skill, e.target.checked);
                        this.currentPage = 1;
                        localStorage.setItem('mainCVCurrentPage', this.currentPage);
                        this.renderCVs();
                    });
                    const span = document.createElement('span');
                    span.textContent = skill;
                    label.appendChild(checkbox);
                    label.appendChild(span);
                    skillsContainer.appendChild(label);
                });
                if (filteredSkills.length > 5) {
                    skillsContainer.classList.add('collapsed');
                } else {
                    skillsContainer.classList.remove('collapsed');
                }
            };
            renderSkills();
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredSkills = sortedSkills.filter(skill =>
                    skill.toLowerCase().includes(searchTerm)
                );
                renderSkills(filteredSkills);
            });
        },

        createCheckboxes(container, itemsSet, filterKey) {
            container.innerHTML = '';
            let itemsArr = Array.from(itemsSet).sort();
            itemsArr.forEach(item => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = item;
                checkbox.addEventListener('change', (e) => {
                    this.toggleFilter(this.filters[filterKey], item, e.target.checked);
                    this.currentPage = 1;
                    localStorage.setItem('mainCVCurrentPage', this.currentPage);
                    this.renderCVs();
                });
                const span = document.createElement('span');
                span.textContent = item;
                label.appendChild(checkbox);
                label.appendChild(span);
                container.appendChild(label);
            });
            if (itemsArr.length > 5) {
                container.classList.add('collapsed');
            } else {
                container.classList.remove('collapsed');
            }
        },

        toggleFilter(set, value, isChecked) {
            if (isChecked) {
                set.add(value);
            } else {
                set.delete(value);
            }
        },

        bindSearchEvents() {
            const searchInput = document.getElementById('search-input');
            if (!searchInput) return;
            this.elements.searchInput = searchInput;
            searchInput.addEventListener('input', () => {
                this.searchTerm = searchInput.value.trim().toLowerCase();
                this.currentPage = 1;
                localStorage.setItem('mainCVCurrentPage', this.currentPage);
                this.renderCVs();
            });
        },

        bindFilterEvents() {
            if (!this.elements.clearFiltersBtn) return;
            this.elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        },

        clearAllFilters() {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            this.searchTerm = '';
            this.filters = {
                skills: new Set(),
                education_level: new Set(),
                education_full: new Set(),
            };
            this.currentPage = 1;
            localStorage.setItem('mainCVCurrentPage', this.currentPage);
            this.populateFilters();
            this.renderCVs();
        },

        filteredCVs() {
            let filteredCVs = this.allCVs;
            if (this.searchTerm) {
                filteredCVs = filteredCVs.filter(card =>
                    (card.name ?? '').toLowerCase().includes(this.searchTerm) ||
                    (card.skills ?? []).some(skill => skill.toLowerCase().includes(this.searchTerm))
                );
            }
            if (this.filters.skills.size > 0) {
                filteredCVs = filteredCVs.filter(card =>
                    card.skills && Array.from(this.filters.skills).every(skill => card.skills.includes(skill))
                );
            }
            if (this.filters.education_level.size > 0) {
                filteredCVs = filteredCVs.filter(card =>
                    this.filters.education_level.has(card.education_level)
                );
            }
            if (this.filters.education_full.size > 0) {
                filteredCVs = filteredCVs.filter(card =>
                    this.filters.education_full.has(card.education_full)
                );
            }
            return filteredCVs;
        },

        renderCVs() {
            const filteredCVs = this.filteredCVs();
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            const paginatedCVs = filteredCVs.slice(start, end);
            if (paginatedCVs.length === 0) {
                this.setUIState('empty');
                if (this.elements.pagination) this.elements.pagination.innerHTML = '';
                if (this.elements.allJobsText) this.elements.allJobsText.textContent = `No results for "${this.searchTerm}"`;
                return;
            }
            this.elements.vacanciesList.innerHTML = paginatedCVs
                .map((card, idx) => this.createCVCardHTML(card, idx))
                .join('');
            this.renderPagination(filteredCVs.length);
            if (this.elements.allJobsText) this.elements.allJobsText.textContent = `Показано ${Math.min(filteredCVs.length, end)} из ${filteredCVs.length} результатов`;
        },

        renderPagination(totalItems) {
            const pageCount = Math.ceil(totalItems / this.itemsPerPage);
            const current = this.currentPage;

            if (pageCount <= 1) {
                this.elements.pagination.innerHTML = '';
                this.elements.pagination.classList.add('hidden');
                return;
            }
            else {
                this.elements.pagination.classList.remove('hidden');
            }

            let html = '';

            // Кнопка "Назад"
            html += `<button class="arrow-btn" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>‹</button>`;

            // Логика отображения страниц
            if (pageCount <= 7) {
                // Показываем все страницы если их мало
                for (let i = 1; i <= pageCount; i++) {
                    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
            } else {
                // Сложная логика для большого количества страниц
                html += `<button class="page-btn ${1 === current ? 'active' : ''}" data-page="1">1</button>`;

                if (current > 4) {
                    html += `<span class="ellipsis">...</span>`;
                }

                let start = Math.max(2, current - 1);
                let end = Math.min(pageCount - 1, current + 1);

                if (current <= 3) {
                    end = Math.min(5, pageCount - 1);
                }
                if (current >= pageCount - 2) {
                    start = Math.max(pageCount - 4, 2);
                }

                for (let i = start; i <= end; i++) {
                    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }

                if (current < pageCount - 3) {
                    html += `<span class="ellipsis">...</span>`;
                }

                if (pageCount > 1) {
                    html += `<button class="page-btn ${pageCount === current ? 'active' : ''}" data-page="${pageCount}">${pageCount}</button>`;
                }
            }

            // Кнопка "Вперед"
            html += `<button class="arrow-btn" data-page="${current + 1}" ${current >= pageCount ? 'disabled' : ''}>›</button>`;

            this.elements.pagination.innerHTML = html;
        },

        createCVCardHTML(card, idx) {
            const skillsHTML = (card.skills || []).map(skill =>
                `<div class="cv-skill-tag">${skill}</div>`
            ).join(' ');
            let photoContent = 'Фото';
            if (card.photoUrl) {
                photoContent = `<img src="${card.photoUrl}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.style.display='none'; this.parentElement.innerHTML='Ошибка загрузки фото';">`;
            }
            return `
                <div class="cv-card" data-idx="${idx}">
                    <div class="card-header">
                        <div class="logo-place">${photoContent}</div>
                        <div class="job-title-info">
                            <h2>${card.name ?? ''}</h2>
                            <span>${card.surname ?? ''}</span>
                        </div>
                    </div>
                    <div class="card-details">
                        <div class="detail-item">
                            <img src="/pics/education.png" alt="education">
                            <span>${card.education_level ?? ''}</span>
                        </div>
                        <div class="detail-item">
                            <span>${card.education_full ?? ''}</span>
                        </div>
                    </div>
                    <div class="cv-skills">${skillsHTML}</div>
                    <div class="card-description">
                        <p>${card.description ?? ''}</p>
                    </div>
                    <div class="buttoms">
                        <button class="apply-button" ${card.cvFileName ? '' : 'disabled'}>Скачать CV</button>
                        <button class="apply-button" ${card.email ? '' : 'disabled'}>Связаться</button>
                    </div>
                </div>
            `;
        },

        setUIState(state, message = '') {
            const list = this.elements.vacanciesList;
            switch (state) {
                case 'loading':
                    list.innerHTML = '<p class="loading">Загрузка резюме...</p>';
                    if (this.elements.pagination) this.elements.pagination.innerHTML = '';
                    break;
                case 'error':
                    list.innerHTML = `<p class="error">${message}</p>`;
                    if (this.elements.pagination) this.elements.pagination.innerHTML = '';
                    break;
                case 'empty':
                    list.innerHTML = '<div class="empty-state"><i class="fas fa-server"></i><p>Сервер не вернул ни одной карточки</p></div>';
                    break;
                default:
                    break;
            }
        },
    };

    app.init();

    // Scroll-to-top button logic
    const scrollBtn = document.getElementById('scrollBtn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.style.display = 'flex';
        } else {
            scrollBtn.style.display = 'none';
        }
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
