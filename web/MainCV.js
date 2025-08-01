import { SERVER_URL } from "/web/config.js";

if (!localStorage.getItem('userEmail')) {
    window.location.href = '/log_in_page';
}


document.addEventListener('DOMContentLoaded', () => {

    const mobileFilterBtn = document.querySelector('.mobile-filter-btn');
    const mobileFiltersPanel = document.querySelector('.mobile-filters-panel');
    const mobileFiltersHideBtn = document.querySelector('.mobile-filters-hide');
    const mainContentWrapper = document.querySelector('.main_content');
    const desktopFilters = document.querySelector('.filters-conteiner');

    function isMobile() {
        return window.innerWidth <= 750;
    }

    function toggleFiltersVisibility() {
        if (isMobile()) {
            if (desktopFilters) desktopFilters.style.display = 'none';
            if (mobileFiltersPanel) mobileFiltersPanel.style.display = 'none';
            if (mobileFilterBtn) mobileFilterBtn.style.display = 'block';
            if (mainContentWrapper) mainContentWrapper.style.marginTop = '0';
        } else {
            if (mobileFiltersPanel) mobileFiltersPanel.style.display = 'none';
            if (desktopFilters) desktopFilters.style.display = '';
            if (mobileFilterBtn) mobileFilterBtn.style.display = 'none';
            if (mainContentWrapper) mainContentWrapper.style.marginTop = '';
        }
    }

    if (mobileFilterBtn && mobileFiltersPanel && mobileFiltersHideBtn) {
        mobileFilterBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (mobileFiltersPanel.style.display === 'none' || mobileFiltersPanel.style.display === '') {
                mobileFiltersPanel.style.display = 'flex';
            } else {
                mobileFiltersPanel.style.display = 'none';
            }
        });

        mobileFiltersHideBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isMobile()) {
                mobileFiltersPanel.style.display = 'none';
            }
        });

        mobileFiltersPanel.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    document.body.addEventListener('click', function () {
        if (isMobile() && mobileFiltersPanel.style.display === 'flex') {
            mobileFiltersPanel.style.display = 'none';
        }
    });

    window.addEventListener('resize', toggleFiltersVisibility);
    toggleFiltersVisibility();

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
            this.elements.mobileFiltersPanel = document.querySelector('.mobile-filters-panel');
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
            this.elements.vacanciesList.addEventListener('click', async (e) => {
                const target = e.target.closest('.apply-button');
                if (!target) return;

                const cardElement = target.closest('.cv-card');
                if (!cardElement) return;

                const cardIndex = cardElement.dataset.idx;
                if (cardIndex === undefined) return;

                const card = this.filteredCVs()[cardIndex];
                if (!card) return;

                const action = target.dataset.action;

                if (action === 'download') {
                    if (card.cvFileName && card.user_email && typeof card.card_id === 'number') {
                        await this.downloadCV(card.user_email, card.card_id, card.cvFileName);
                    } else {
                        alert('Недостаточно данных для скачивания CV.');
                    }
                } else if (action === 'contact') {
                    if (card.user_email) {
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(card.user_email)}`;
                        window.open(gmailUrl, '_blank');
                    } else {
                        alert('Email для связи не найден.');
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
                    cvFileName: card.cv_name || '',
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

            const populateSection = (section, mobileSection) => {
                const header = section.querySelector('h2').textContent.toLowerCase();
                const variantsContainer = section.querySelector('.filter_variants');
                const mobileVariantsContainer = mobileSection ? mobileSection.querySelector('.filter_variants') : null;

                if (header.includes('навыки') || header.includes('skills')) {
                    this.createSkillFilter(variantsContainer, skillsSet);
                    if (mobileVariantsContainer) this.createSkillFilter(mobileVariantsContainer, skillsSet);
                } else if (header.includes('уровень')) {
                    this.createCheckboxes(variantsContainer, educationLevelSet, 'education_level');
                    if (mobileVariantsContainer) this.createCheckboxes(mobileVariantsContainer, educationLevelSet, 'education_level');
                } else if (header.includes('статус')) {
                    this.createCheckboxes(variantsContainer, educationFullSet, 'education_full');
                    if (mobileVariantsContainer) this.createCheckboxes(mobileVariantsContainer, educationFullSet, 'education_full');
                }
            };

            const desktopSections = this.elements.filterContainer.querySelectorAll('.filter_section');
            const mobileSections = this.elements.mobileFiltersPanel.querySelectorAll('.filter_section');

            desktopSections.forEach((section, index) => {
                const mobileSection = mobileSections[index] || null;
                populateSection(section, mobileSection);
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
            const handleCheckboxChange = (checkbox) => {
                const filterSection = checkbox.closest('.filter_section');
                if (!filterSection) return;

                const headerText = filterSection.querySelector('h2').textContent.toLowerCase();
                const value = checkbox.value;
                let filterKey;

                if (headerText.includes('уровень')) {
                    filterKey = 'education_level';
                } else if (headerText.includes('статус')) {
                    filterKey = 'education_full';
                } else if (headerText.includes('навыки')) {
                    filterKey = 'skills';
                }

                if (filterKey) {
                    this.toggleFilter(this.filters[filterKey], value, checkbox.checked);
                    this.currentPage = 1;
                    localStorage.setItem('mainCVCurrentPage', this.currentPage);
                    this.renderCVs();
                }
            };

            const syncCheckboxes = (sourceCheckbox) => {
                const sourceContainer = sourceCheckbox.closest('.filters-conteiner, .mobile-filters-panel');
                const isDesktop = sourceContainer.classList.contains('filters-conteiner');
                const targetContainer = isDesktop ? this.elements.mobileFiltersPanel : this.elements.filterContainer;

                if (targetContainer) {
                    const targetCheckbox = Array.from(targetContainer.querySelectorAll('input[type="checkbox"]'))
                        .find(cb => cb.value === sourceCheckbox.value);
                    if (targetCheckbox) {
                        targetCheckbox.checked = sourceCheckbox.checked;
                    }
                }
            };

            const setupFilterListeners = (container) => {
                if (!container) return;
                container.addEventListener('change', (e) => {
                    const checkbox = e.target;
                    if (checkbox.tagName === 'INPUT' && checkbox.type === 'checkbox') {
                        syncCheckboxes(checkbox);
                        handleCheckboxChange(checkbox);
                    }
                });
            };

            setupFilterListeners(this.elements.filterContainer);
            setupFilterListeners(this.elements.mobileFiltersPanel);

            if (this.elements.clearFiltersBtn) {
                this.elements.clearFiltersBtn.addEventListener('click', () => {
                    this.clearAllFilters();
                });
            }
        },

        clearAllFilters() {
            this.elements.filterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            this.elements.mobileFiltersPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

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

            if (this.elements.vacanciesList) {
                if (paginatedCVs.length === 0) {
                    this.setUIState('empty');
                } else {
                    this.elements.vacanciesList.innerHTML = paginatedCVs
                        .map((card, index) => this.createCVCardHTML(card, start + index))
                        .join('');
                    this.setUIState('default');
                }
            }

            if (this.elements.allJobsText) {
                this.elements.allJobsText.textContent = `Показано ${filteredCVs.length} из ${this.allCVs.length} результатов`;
            }
            this.renderPagination(filteredCVs.length);
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
            const photoUrl = card.photoFileName ? `${SERVER_URL}/users/photo/${card.user_email}/${card.card_id}` : '/pics/profile.png';
            const skillsHTML = card.skills.map(skill => `<div class="cv-skill-tag">${skill}</div>`).join('');

            return `
                <div class="cv-card" data-idx="${idx}">
                    <div class="card-header">
                        <div class="logo-place">
                            <img src="${photoUrl}" alt="User photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                        </div>
                        <div class="job-title-info">
                            <h2>${card.name} ${card.surname}</h2>
                        </div>
                    </div>
                    <div class="card-details">
                        <div class="detail-item">
                            <img src="/pics/education.png" alt="education">
                            <span>${card.education_level}</span>
                        </div>
                        <div class="detail-item">
                            <span>${card.education_full}</span>
                        </div>
                    </div>
                    <div class="cv-skills">
                        ${skillsHTML}
                    </div>
                    <div class="card-description">
                        <p>${card.description}</p>
                    </div>
                    <div class="buttoms">
                        <button class="apply-button" 
                                data-action="download"
                                data-id="${card.card_id}" 
                                data-email="${card.user_email}" 
                                data-cv="${card.cvFileName}">
                            Скачать CV
                        </button>
                        <button class="apply-button" 
                                data-action="contact" 
                                data-email="${card.user_email}">Cвязаться</button>
                    </div>
                </div>`;
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

        /**
         * Аналог downloadCV из UserProfilePage.js
         */
        async downloadCV(email, cardId, fileName) {
            try {
                const res = await fetch(`${SERVER_URL}/users/cv/${encodeURIComponent(email)}/${cardId}`);
                if (!res.ok) throw new Error('CV не найдено на сервере');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName || 'CV.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (e) {
                alert('Ошибка при скачивании CV: ' + e.message);
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

        if (window.innerWidth <= 750) { // Only for mobile
            const paginationContainer = document.getElementById('pagination');
            if (!paginationContainer || getComputedStyle(paginationContainer).display === 'none') {
                scrollBtn.style.bottom = '30px';
                return;
            };

            const docHeight = document.documentElement.scrollHeight;
            const viewportBottom = window.innerHeight + window.scrollY;

            const footerStop = docHeight - paginationContainer.offsetHeight;

            if (viewportBottom >= footerStop) {
                const newBottom = (viewportBottom - footerStop) + 37;
                scrollBtn.style.bottom = `${newBottom}px`;
            } else {
                scrollBtn.style.bottom = '30px';
            }
        } else {
            scrollBtn.style.bottom = '30px';
        }
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // ВЫХОД: очищаем localStorage и редиректим на welcome
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/welcome';
        });
    }
});

