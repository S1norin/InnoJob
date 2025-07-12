import { SERVER_URL } from "/web/config.js";

document.addEventListener('DOMContentLoaded', () => {

    const app = {

        elements: {},
        allVacancies: [],
        currentPage: 1,
        itemsPerPage: 6,
        searchTerm: '',

        filters: {
            jobTypes: new Set(),
            experiences: new Set(),
            locations: new Set(),
            companies: new Set(),
            salaryFrom: null,
            salaryTo: null
        },

        init() {
            this.cacheDOMElements();
            this.bindEvents();
            this.fetchAndRenderVacancies();
            this.bindApplyButtons();
            this.bindSearchEvents();
            this.bindFilterEvents();
        },

        cacheDOMElements() {
            this.elements.vacanciesList = document.getElementById('vacancies-list');
            this.elements.pagination = document.getElementById('pagination');
            this.elements.allJobsText = document.querySelector('.all_jobs_text p');
            this.elements.filterContainer = document.querySelector('.filters-conteiner');
            this.elements.salaryInputs = document.querySelectorAll('.salary-inputs input');
            this.elements.clearFiltersBtn = document.getElementById('clear-filters');
            this.elements.searchInput = document.getElementById('search-input');
        },

        bindEvents() {
            this.elements.pagination.addEventListener('click', (e) => {
                if (e.target.matches('.page-btn') || e.target.matches('.arrow-btn')) {
                    const page = parseInt(e.target.dataset.page, 10);
                    if (!isNaN(page) && page !== this.currentPage && !e.target.disabled) {
                        // Добавляем анимацию перехода
                        const oldActive = this.elements.pagination.querySelector('.page-btn.active');
                        if (oldActive) {
                            oldActive.style.transform = 'scale(1)';
                        }

                        this.currentPage = page;
                        this.renderVacancies();

                        setTimeout(() => {
                            const newActive = this.elements.pagination.querySelector('.page-btn.active');
                            if (newActive) {
                                newActive.style.transform = 'scale(1.1)';
                            }
                        }, 50);
                    }
                }
            });
        },


        async fetchAndRenderVacancies() {
            this.setUIState('loading');
            try {
                const response = await fetch(`${SERVER_URL}/vacancies`);
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                this.allVacancies = await response.json();

                this.populateFilters();
                this.renderVacancies();
            } catch (error) {
                console.error('Ошибка при загрузке вакансий:', error);
                this.setUIState('error', `Не удалось загрузить вакансии. Детали: ${error.message}`);
            }
        },

        populateFilters() {
            const jobTypesSet = new Set();
            const experiencesSet = new Set();
            const locationsMap = new Map(); // Changed to Map to count vacancies
            const companiesSet = new Set();

            const salaries = [];

            this.allVacancies.forEach(vacancy => {
                if (vacancy.format) jobTypesSet.add(vacancy.format);
                if (vacancy.experience) experiencesSet.add(vacancy.experience);
                if (vacancy.employer) companiesSet.add(vacancy.employer);

                // Count vacancies per city
                if (vacancy.city) {
                    const city = vacancy.city;
                    locationsMap.set(city, (locationsMap.get(city) || 0) + 1);
                }

                if (vacancy.salary_from && vacancy.salary_from > 0) {
                    salaries.push(vacancy.salary_from);
                }
                if (vacancy.salary_to && vacancy.salary_to > 0) {
                    salaries.push(vacancy.salary_to);
                }
            });

            const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
            const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 1000000;

            this.updateSalaryInputs(minSalary, maxSalary);

            const sortExperience = (a, b) => {
                const orderMap = {
                    'нет опыта': 0,
                };

                const getMinYears = (str) => {
                    const match = str.match(/\d+/);
                    return match ? parseInt(match[0], 10) : Infinity;
                };

                if (orderMap.hasOwnProperty(a)) {
                    if (orderMap.hasOwnProperty(b)) {
                        return orderMap[a] - orderMap[b];
                    }
                    return -1;
                }
                if (orderMap.hasOwnProperty(b)) {
                    return 1;
                }

                return getMinYears(a) - getMinYears(b);
            };

            // const createCheckboxes = (container, itemsSet, isExperience = false) 
            const createCheckboxes = (container, itemsSet, isExperience = false, showCount = false, countMap = null) => {
                container.innerHTML = '';
                let itemsArr = Array.from(itemsSet);

                if (isExperience) {
                    itemsArr.sort(sortExperience);
                } else {
                    itemsArr.sort();
                }

                itemsArr.forEach(item => {
                    const label = document.createElement('label');
                    label.className = 'checkbox-label';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = item;
                    const span = document.createElement('span');
                    span.textContent = this.capitalizeWords(item);

                    label.appendChild(checkbox);
                    label.appendChild(span);

                    // if (showCount && countMap) {
                    //     const countBadge = document.createElement('span');
                    //     countBadge.className = 'vacancy-count';
                    //     countBadge.textContent = countMap.get(item) || 0;
                    //     label.appendChild(countBadge);
                    // }

                    container.appendChild(label);
                });

                if (itemsArr.length > 5) {
                    container.classList.add('collapsed');
                } else {
                    container.classList.remove('collapsed');
                }
            };

            const createCityFilter = (container, locationsMap) => {
                container.innerHTML = '';

                const searchWrapper = document.createElement('div');
                searchWrapper.className = 'city-search-wrapper';

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Поиск городов...';
                searchInput.className = 'city-search-input';

                searchWrapper.appendChild(searchInput);
                container.appendChild(searchWrapper);

                const citiesContainer = document.createElement('div');
                citiesContainer.className = 'cities-container';
                container.appendChild(citiesContainer);

                const sortedCities = Array.from(locationsMap.entries())
                    .sort((a, b) => b[1] - a[1]);

                const renderCities = (filteredCities = sortedCities) => {
                    citiesContainer.innerHTML = '';

                    filteredCities.forEach(([city, count]) => {
                        // const label = document.createElement('label');
                        // label.className = 'city-label';

                        const label = document.createElement('label');
                        label.className = 'checkbox-label';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = city;

                        const cityName = document.createElement('span');
                        cityName.textContent = this.capitalizeWords(city);

                        const countBadge = document.createElement('span');
                        countBadge.textContent = count;
                        countBadge.className = 'vacancy-count';

                        label.appendChild(checkbox);
                        label.appendChild(cityName);
                        label.appendChild(countBadge);
                        citiesContainer.appendChild(label);
                    });
                };

                renderCities();

                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredCities = sortedCities.filter(([city]) =>
                        city.toLowerCase().includes(searchTerm)
                    );
                    renderCities(filteredCities);
                });
            };


            const sections = this.elements.filterContainer.querySelectorAll('.filter_section');

            sections.forEach(section => {
                const header = section.querySelector('h2').textContent.toLowerCase();
                const variantsContainer = section.querySelector('.filter_variants');

                if (header.includes('тип работы')) {
                    createCheckboxes(variantsContainer, jobTypesSet);
                } else if (header.includes('опыт работы')) {
                    createCheckboxes(variantsContainer, experiencesSet, true);
                } else if (header.includes('город') || header.includes('location')) {
                    createCityFilter(variantsContainer, locationsMap);
                } else if (header.includes('компания') || header.includes('company')) {
                    createCheckboxes(variantsContainer, companiesSet);
                }
            });

            this.setupShowMoreButtons();
        },

        updateSalaryInputs(minSalary, maxSalary) {
            const formatSalaryForDisplay = (salary) => {
                if (salary >= 1000000) {
                    return `${Math.floor(salary)}`;
                } else if (salary >= 1000) {
                    return `${Math.floor(salary)}`;
                }
                return salary.toString();
            };

            if (this.elements.salaryInputs && this.elements.salaryInputs.length >= 2) {
                this.elements.salaryInputs[0].placeholder = `От ${formatSalaryForDisplay(minSalary)}`;
                this.elements.salaryInputs[1].placeholder = `До ${formatSalaryForDisplay(maxSalary)}`;

                this.elements.salaryInputs[0].setAttribute('data-min', minSalary);
                this.elements.salaryInputs[1].setAttribute('data-max', maxSalary);

                const salarySection = this.elements.salaryInputs[0].closest('.filter_section');
                if (salarySection) {
                    let rangeInfo = salarySection.querySelector('.salary-range-info');
                    if (!rangeInfo) {
                        rangeInfo = document.createElement('div');
                        rangeInfo.className = 'salary-range-info';
                        rangeInfo.style.fontSize = '12px';
                        rangeInfo.style.color = '#666';
                        rangeInfo.style.marginTop = '5px';
                        salarySection.appendChild(rangeInfo);
                    }
                }
            }
        },

        setupShowMoreButtons() {
            const filterSections = this.elements.filterContainer.querySelectorAll('.filter_section');
            filterSections.forEach(section => {
                const header = section.querySelector('h2').textContent.toLowerCase();
                const variantsContainer = section.querySelector('.filter_variants');
                const showMoreBtn = section.querySelector('.show-more-btn');

                if (!showMoreBtn) return;

                // Специальная обработка для городов
                if (header.includes('город') || header.includes('location')) {
                    const citiesContainer = variantsContainer.querySelector('.cities-container');
                    if (citiesContainer && citiesContainer.children.length > 5) {
                        showMoreBtn.style.display = 'inline-block';
                        showMoreBtn.textContent = 'Показать больше';
                        citiesContainer.classList.add('collapsed');

                        // Удаляем старые обработчики событий
                        showMoreBtn.onclick = null;

                        // Добавляем новый обработчик
                        showMoreBtn.onclick = () => {
                            if (citiesContainer.classList.contains('collapsed')) {
                                citiesContainer.classList.remove('collapsed');
                                showMoreBtn.textContent = 'Показать меньше';
                            } else {
                                citiesContainer.classList.add('collapsed');
                                showMoreBtn.textContent = 'Показать больше';
                            }
                        };
                    } else {
                        showMoreBtn.style.display = 'none';
                        if (citiesContainer) {
                            citiesContainer.classList.remove('collapsed');
                        }
                    }
                } else {
                    // Обычная обработка для других фильтров
                    if (variantsContainer.children.length > 5) {
                        showMoreBtn.style.display = 'inline-block';
                        showMoreBtn.textContent = 'Показать больше';
                        variantsContainer.classList.add('collapsed');

                        showMoreBtn.onclick = () => {
                            if (variantsContainer.classList.contains('collapsed')) {
                                variantsContainer.classList.remove('collapsed');
                                showMoreBtn.textContent = 'Показать меньше';
                            } else {
                                variantsContainer.classList.add('collapsed');
                                showMoreBtn.textContent = 'Показать больше';
                            }
                        };
                    } else {
                        showMoreBtn.style.display = 'none';
                        variantsContainer.classList.remove('collapsed');
                    }
                }
            });
        },


        bindApplyButtons() {
            this.elements.vacanciesList.addEventListener('click', (e) => {
                if (e.target.matches('.apply-button')) {
                    const link = e.target.dataset.link;
                    if (link) {
                        window.open(link, '_blank');
                    } else {
                        alert('Ссылка для отклика не указана.');
                    }
                }
            });
        },

        bindFilterEvents() {
            this.elements.filterContainer.addEventListener('change', (e) => {
                const checkbox = e.target;
                if (checkbox.tagName === 'INPUT' && checkbox.type === 'checkbox') {
                    const labelText = checkbox.nextElementSibling?.textContent.trim().toLowerCase();

                    if (!labelText) return;

                    const section = checkbox.closest('.filter_section');
                    if (!section) return;
                    const headerText = section.querySelector('h2').textContent.toLowerCase();

                    if (headerText.includes('тип работы')) {
                        this.toggleFilter(this.filters.jobTypes, labelText, checkbox.checked);
                    } else if (headerText.includes('опыт работы')) {
                        this.toggleFilter(this.filters.experiences, labelText, checkbox.checked);
                    } else if (headerText.includes('город')) {
                        this.toggleFilter(this.filters.locations, labelText, checkbox.checked);
                    } else if (headerText.includes('компания') || headerText.includes('company')) {
                        this.toggleFilter(this.filters.companies, labelText, checkbox.checked);
                    }

                    this.currentPage = 1;
                    this.renderVacancies();
                }
            });

            this.elements.salaryInputs.forEach((input, index) => {
                input.addEventListener('keydown', (e) => {
                    const allowedKeys = [
                        'Backspace', 'Delete', 'Tab', 'Enter',
                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                        'Home', 'End'
                    ];

                    if (e.ctrlKey || e.metaKey) {
                        return;
                    }

                    if (!allowedKeys.includes(e.key) && !/^[0-9]$/.test(e.key)) {
                        e.preventDefault();
                    }
                });

                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');

                    const maxValue = 10000000;
                    if (parseInt(value) > maxValue) {
                        value = maxValue.toString();
                    }

                    e.target.value = value;

                    const minAllowed = parseInt(e.target.getAttribute('data-min')) || 0;
                    const maxAllowed = parseInt(e.target.getAttribute('data-max')) || Infinity;
                    const val = parseInt(value);

                    if (!isNaN(val)) {
                        if ((index === 0 && val < minAllowed) || (index === 1 && val > maxAllowed)) {
                            e.target.style.borderColor = '#ff6b6b';
                            e.target.title = index === 0
                                ? `Минимальная зарплата: ${minAllowed}`
                                : `Максимальная зарплата: ${maxAllowed}`;
                        } else {
                            e.target.style.borderColor = '';
                            e.target.title = '';
                        }
                    } else {
                        e.target.style.borderColor = '';
                        e.target.title = '';
                    }

                    if (index === 0) {
                        this.filters.salaryFrom = !isNaN(val) ? val : null;
                    } else {
                        this.filters.salaryTo = !isNaN(val) ? val : null;
                    }

                    this.currentPage = 1;
                    this.renderVacancies();
                });

                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                    const numericValue = paste.replace(/\D/g, '');
                    if (numericValue) {
                        const maxValue = 10000000;
                        const finalValue = Math.min(parseInt(numericValue), maxValue).toString();
                        e.target.value = finalValue;
                        e.target.dispatchEvent(new Event('input'));
                    }
                });

                input.addEventListener('keypress', (e) => {
                    if (!/[0-9]/.test(e.key) &&
                        !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {

                        input.style.borderColor = '#ff6b6b';
                        input.title = 'Можно вводить только цифры';

                        setTimeout(() => {
                            if (input.style.borderColor === 'rgb(255, 107, 107)') {
                                input.style.borderColor = '';
                                input.title = '';
                            }
                        }, 2000);
                    }
                });

                input.addEventListener('focus', (e) => {
                    if (e.target.title === 'Можно вводить только цифры') {
                        e.target.style.borderColor = '';
                        e.target.title = '';
                    }
                });
            });

            this.elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        },

        toggleFilter(set, value, isChecked) {
            if (isChecked) {
                set.add(value);
            } else {
                set.delete(value);
            }
        },

        clearAllFilters() {
            const checkboxes = this.elements.filterContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);

            this.elements.salaryInputs[0].value = '';
            this.elements.salaryInputs[1].value = '';
            this.elements.searchInput.value = '';

            // Clear city search input
            const citySearchInput = this.elements.filterContainer.querySelector('.city-search-input');
            if (citySearchInput) {
                citySearchInput.value = '';
            }

            this.searchTerm = '';

            this.filters = {
                jobTypes: new Set(),
                experiences: new Set(),
                locations: new Set(),
                companies: new Set(),
                salaryFrom: null,
                salaryTo: null
            };

            this.searchTerm = '';
            document.getElementById('search-input').value = '';

            this.currentPage = 1;

            this.populateFilters();
            this.renderVacancies();
        },

        bindSearchEvents() {
            const searchInput = document.getElementById('search-input');
            this.elements.searchInput = searchInput;

            searchInput.addEventListener('input', () => {
                this.searchTerm = searchInput.value.trim().toLowerCase();
                this.currentPage = 1;
                this.renderVacancies();
            });
        },

        renderVacancies() {
            let filteredVacancies = this.allVacancies;

            if (this.searchTerm) {
                filteredVacancies = filteredVacancies.filter(vacancy =>
                    (vacancy.name ?? '').toLowerCase().includes(this.searchTerm)
                );
            }

            if (this.filters.jobTypes.size > 0) {
                filteredVacancies = filteredVacancies.filter(v =>
                    this.filters.jobTypes.has((v.format ?? '').toLowerCase())
                );
            }

            if (this.filters.experiences.size > 0) {
                filteredVacancies = filteredVacancies.filter(v =>
                    this.filters.experiences.has((v.experience ?? '').toLowerCase())
                );
            }

            if (this.filters.locations.size > 0) {
                filteredVacancies = filteredVacancies.filter(v =>
                    this.filters.locations.has((v.city ?? '').toLowerCase())
                );
            }

            if (this.filters.companies.size > 0) {
                filteredVacancies = filteredVacancies.filter(v =>
                    this.filters.companies.has((v.employer ?? '').toLowerCase())
                );
            }

            if (this.filters.salaryFrom !== null) {
                filteredVacancies = filteredVacancies.filter(v =>
                    (v.salary_from ?? 0) >= this.filters.salaryFrom
                );
            }

            if (this.filters.salaryTo !== null) {
                filteredVacancies = filteredVacancies.filter(v =>
                    (v.salary_to ?? Infinity) <= this.filters.salaryTo
                );
            }

            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            const paginatedVacancies = filteredVacancies.slice(start, end);

            if (paginatedVacancies.length === 0) {
                this.setUIState('empty');
                this.elements.pagination.innerHTML = '';
                this.elements.allJobsText.textContent = `No results for "${this.searchTerm}"`;
                return;
            }

            this.elements.vacanciesList.innerHTML = paginatedVacancies
                .map(vacancy => this.createVacancyCardHTML(vacancy))
                .join('');

            this.renderPagination(filteredVacancies.length);

            this.elements.allJobsText.textContent = `Показано ${Math.min(filteredVacancies.length, end)} из ${filteredVacancies.length} результатов`;
        },

        renderPagination(totalItems) {
            const pageCount = Math.ceil(totalItems / this.itemsPerPage);
            const current = this.currentPage;

            if (pageCount <= 1) {
                this.elements.pagination.innerHTML = '';
                return;
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


        formatSalaryNumber(number) {
            if (number >= 1_000_000) {
                return `${(number / 1_000_000).toFixed(1)}M`;
            } else if (number >= 1_000) {
                return `${(number / 1_000).toFixed(0)}k`;
            } else {
                return number.toString();
            }
        },

        createVacancyCardHTML(vacancy) {
            let salaryText = '-';
            if (vacancy.salary_from || vacancy.salary_to) {
                const from = vacancy.salary_from ? `от ${this.formatSalaryNumber(vacancy.salary_from)}` : '';
                const to = vacancy.salary_to ? `до ${this.formatSalaryNumber(vacancy.salary_to)}` : '';
                salaryText = `${from} ${to}`.trim();
            }

            const tags = [];
            if (vacancy.format && vacancy.format !== "empty") {
                tags.push(vacancy.format);
            } 

            return `
                <div class="vacancy-card">
                    <div class="card-header">
                        <div class="logo-place"></div>

                        <div class="job-title-info">
                            <h2>${vacancy.name ?? 'Vacancy Name'}</h2>
                            <span>${vacancy.employer ?? 'Company'}</span>
                        </div>
                    </div>

                    <div class="card-details">
                        <div class="detail-item">
                            <img src="/pics/location.png" alt="Location">
                            <span>${vacancy.city ?? 'No city'}</span>
                        </div>
                        <div class="detail-item">
                            <img src="/pics/salary.png" alt="Salary">
                            <span>${salaryText}</span>
                        </div>
                        <div class="job-type-tag">${vacancy.format ?? 'Формат работы'}</div>
                    </div>

                    <div class="card-description">
                        <p>${vacancy.description ?? 'Описание вакансии недоступно.'}</p>
                    </div>

                    <div class="skills-section">
                        <div class="skill-tags">
                            <span class="skill-tag">${vacancy.experience ?? ''}</span>
                        </div>
                        <button class="apply-button" data-link="${vacancy.link ?? '#'}">Откликнуться</button>
                    </div>
                </div>
            `;
        },

        setUIState(state, message = '') {
            const list = this.elements.vacanciesList;
            switch (state) {
                case 'loading':
                    list.innerHTML = '<p class="loading">Загрузка вакансий...</p>';
                    this.elements.pagination.innerHTML = '';
                    break;
                case 'error':
                    list.innerHTML = `<p class="error">${message}</p>`;
                    this.elements.pagination.innerHTML = '';
                    break;
                case 'empty':
                    list.innerHTML = '<div class="empty-state"><i class="fas fa-server"></i><p>Сервер не вернул ни одной вакансии</p></div>';
                    break;
                default:
                    break;
            }
        },

        capitalizeWords(str) {
            return str.replace(/\b\w/g, char => char.toUpperCase());
        }
    };

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

    app.init();
});
