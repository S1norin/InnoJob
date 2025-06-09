document.addEventListener('DOMContentLoaded', () => {
    /**
     * Основной объект приложения, инкапсулирующий всю логику.
     */
    const app = {
        elements: {},
        allVacancies: [],

        init() {
            this.cacheDOMElements();
            this.bindEvents();
            this.fetchAndRenderVacancies();
        },

        cacheDOMElements() {
            this.elements.vacanciesList = document.getElementById('vacancies-list');
            this.elements.applyFiltersBtn = document.getElementById('applyFilters');
            this.elements.filtersPanel = document.getElementById('filtersPanel');
            this.elements.toggleFilters = document.getElementById('toggleFilters');
            this.elements.searchBar = document.getElementById('searchBar');
        },

        bindEvents() {
            this.elements.applyFiltersBtn.addEventListener('click', () => {
                // Теперь эта кнопка просто перерисовывает полный список
                this.filterAndRender();
                this.elements.filtersPanel.classList.remove('active');
                this.elements.searchBar.classList.remove('active');
            });

            this.elements.toggleFilters.addEventListener('click', (e) => {
                e.stopPropagation();
                this.elements.filtersPanel.classList.toggle('active');
                this.elements.searchBar.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (!this.elements.filtersPanel.contains(e.target) && e.target !== this.elements.toggleFilters) {
                    this.elements.filtersPanel.classList.remove('active');
                    this.elements.searchBar.classList.remove('active');
                }
            });
        },

        async fetchAndRenderVacancies() {
            this.setUIState('loading');
            try {
                const response = await fetch('http://127.0.0.1:8000/vacancies');
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                this.allVacancies = await response.json();
                this.filterAndRender();
            } catch (error) {
                console.error('Ошибка при загрузке вакансий:', error);
                this.setUIState('error', `Не удалось загрузить вакансии. Детали: ${error.message}`);
            }
        },

        // Функция getFiltersFromDOM() нам временно не нужна, так как мы не фильтруем.
        // Оставим ее на будущее.
        getFiltersFromDOM() {
            // ...
        },

        /**
         * ИЗМЕНЕНИЕ ЗДЕСЬ: Эта функция теперь просто вызывает рендеринг полного списка.
         */
        filterAndRender() {
            // Вместо сложной логики фильтрации, мы просто передаем
            // весь кэшированный массив `this.allVacancies` на отрисовку.
            this.renderVacancies(this.allVacancies);
        },

        renderVacancies(vacancies) {
            if (vacancies.length === 0) {
                // Это сообщение теперь будет видно, только если сервер ВООБЩЕ не прислал вакансий.
                this.setUIState('empty');
                return;
            }

            this.elements.vacanciesList.innerHTML = vacancies
                .map(vacancy => this.createVacancyCardHTML(vacancy))
                .join('');
        },

        createVacancyCardHTML(vacancy) {
            let salaryText = 'Зарплата не указана';
            if (vacancy.salary_from || vacancy.salary_to) {
                const from = vacancy.salary_from ? `от ${vacancy.salary_from}` : '';
                const to = vacancy.salary_to ? `до ${vacancy.salary_to}` : '';
                salaryText = `Зарплата: ${from} ${to}`.trim();
            }

            const tags = (vacancy.skills?.split(',') ?? []).map(skill => skill.trim());
            if (vacancy.format && vacancy.format !== "no data") {
                tags.push(vacancy.format);
            }

            return `
                <div class="job-card">
                    <div class="job-header">
                        <img src="${vacancy.logo ?? 'logo1.png'}" alt="Лого компании" class="company-logo">
                        <p class="company-name">${vacancy.company ?? 'Название компании'}</p>
                    </div>
                    <div class="job-content">
                        <h3 class="job-title">${vacancy.name ?? 'Название вакансии'}</h3>
                        <p class="job-salary">${salaryText}</p>
                        <p class="job-description">${vacancy.description ?? 'Описание отсутствует.'}</p>
                        <div class="job-tags">
                            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        <button class="apply-button">Просмотреть вакансию</button>
                    </div>
                </div>
            `;
        },

        setUIState(state, message = '') {
            const list = this.elements.vacanciesList;
            switch (state) {
                case 'loading':
                    list.innerHTML = '<p class="loading">Загрузка вакансий...</p>';
                    break;
                case 'error':
                    list.innerHTML = `<p class="error">${message}</p>`;
                    break;
                case 'empty':
                    // Сообщение о пустом результате теперь более конкретное
                    list.innerHTML = '<div class="empty-state"><i class="fas fa-server"></i><p>Сервер не вернул ни одной вакансии</p></div>';
                    break;
            }
        }
    };

    app.init();
});
