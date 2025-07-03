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
                if (e.target.matches('.page-btn')) {
                    const page = parseInt(e.target.dataset.page, 10);
                    if (!isNaN(page)) {
                        this.currentPage = page;
                        this.renderVacancies();
                    }
                }
            });
        },

        async fetchAndRenderVacancies() {
            this.setUIState('loading');
            try {
                const response = await fetch('http://innojob.ru/vacancies');
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
            const locationsSet = new Set();
            const companiesSet = new Set();

            this.allVacancies.forEach(vacancy => {
                if (vacancy.format) jobTypesSet.add(vacancy.format);
                if (vacancy.experience) experiencesSet.add(vacancy.experience);
                if (vacancy.city) locationsSet.add(vacancy.city);
                if (vacancy.employer) companiesSet.add(vacancy.employer);
            });

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

            const createCheckboxes = (container, itemsSet, isExperience = false) => {
                container.innerHTML = '';
                let itemsArr = Array.from(itemsSet);

                if (isExperience) {
                    itemsArr.sort(sortExperience);
                } else {
                    itemsArr.sort();
                }

                itemsArr.forEach(item => {
                    const label = document.createElement('label');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = item;
                    const span = document.createElement('span');
                    span.textContent = this.capitalizeWords(item);

                    label.appendChild(checkbox);
                    label.appendChild(span);
                    container.appendChild(label);
                });

                if (itemsArr.length > 5) {
                    container.classList.add('collapsed');
                } else {
                    container.classList.remove('collapsed');
                }
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
                    createCheckboxes(variantsContainer, locationsSet);
                } else if (header.includes('компания') || header.includes('company')) {
                    createCheckboxes(variantsContainer, companiesSet);
                }
            });


            this.setupShowMoreButtons();
        },


        setupShowMoreButtons() {
            const filterSections = this.elements.filterContainer.querySelectorAll('.filter_section');
            filterSections.forEach(section => {
                const variantsContainer = section.querySelector('.filter_variants');
                const showMoreBtn = section.querySelector('.show-more-btn');

                if (!showMoreBtn) return;

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

            this.elements.salaryInputs[0].addEventListener('input', () => {
                const val = parseInt(this.elements.salaryInputs[0].value);
                this.filters.salaryFrom = !isNaN(val) ? val : null;
                this.currentPage = 1;
                this.renderVacancies();
            });

            this.elements.salaryInputs[1].addEventListener('input', () => {
                const val = parseInt(this.elements.salaryInputs[1].value);
                this.filters.salaryTo = !isNaN(val) ? val : null;
                this.currentPage = 1;
                this.renderVacancies();
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
            this.searchTerm = '';
            this.populateFilters();
            this.renderVacancies();


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
            let html = '';

            const createPageBtn = (i, text = null, isHidden = false) => {
                return `<button class="page-btn ${i === current ? 'active' : ''} ${isHidden ? 'hidden' : ''}" data-page="${i}">${text || i}</button>`;
            };

            const createEllipsis = (isVisible = true) => {
                return `<span class="ellipsis ${!isVisible ? 'invisible' : ''}">...</span>`;
            };

            if (current > 1) {
                html += createPageBtn(current - 1, '‹');
            }

            html += createPageBtn(1);
            html += createPageBtn(2);

            html += createEllipsis(current > 3);

            if (current !== 1 && current !== 2 && current !== pageCount) {
                html += createPageBtn(current);
            } else {
                html += createPageBtn(current, current, true);
            }

            html += createEllipsis(current < pageCount - 2);

            if (pageCount > 3) {
                html += createPageBtn(pageCount);
            } else {
                html += createPageBtn(pageCount, pageCount, true);
            }

            if (current < pageCount) {
                html += createPageBtn(current + 1, '›');
            }

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
