import {SERVER_URL} from "./config";

document.addEventListener('DOMContentLoaded', () => {
    const app = {
        elements: {},
        allCVs: [],
        currentPage: 1,
        itemsPerPage: 6,
        searchTerm: '',
        filters: {
            skills: new Set(),
            education: new Set(),
        },

        init() {
            this.cacheDOMElements();
            this.bindEvents();
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
                        }
                    }
                });
            }
        },

        async fetchAndRenderCVs() {
            this.setUIState('loading');
            try {
                // Change to your actual API endpoint for user cards
                const response = await fetch(`${SERVER_URL}/cv_listing`);
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                this.allCVs = await response.json();
                this.populateFilters();
                this.renderCVs();
            } catch (error) {
                console.error('Ошибка при загрузке списка резюме:', error);
                this.setUIState('error', `Не удалось загрузить список резюме. Детали: ${error.message}`);
            }
        },

        populateFilters() {
            const skillsSet = new Set();
            const educationSet = new Set();
            this.allCVs.forEach(card => {
                if (card.skills) card.skills.forEach(skill => skillsSet.add(skill));
                if (card.education_full) educationSet.add(card.education_full);
            });
            const sections = document.querySelectorAll('.filter_section');
            sections.forEach(section => {
                const header = section.querySelector('h2').textContent.toLowerCase();
                const variantsContainer = section.querySelector('.filter_variants');
                if (header.includes('навыки') || header.includes('skills')) {
                    this.createCheckboxes(variantsContainer, skillsSet, 'skills');
                } else if (header.includes('образование')) {
                    this.createCheckboxes(variantsContainer, educationSet, 'education');
                }
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
                education: new Set(),
            };
            this.currentPage = 1;
            this.populateFilters();
            this.renderCVs();
        },

        renderCVs() {
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
            if (this.filters.education.size > 0) {
                filteredCVs = filteredCVs.filter(card =>
                    this.filters.education.has(card.education_full)
                );
            }
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
                .map(card => this.createUserCardHTML(card))
                .join('');
            this.renderPagination(filteredCVs.length);
            if (this.elements.allJobsText) this.elements.allJobsText.textContent = `Показано ${Math.min(filteredCVs.length, end)} из ${filteredCVs.length} результатов`;
        },

        renderPagination(totalItems) {
            if (!this.elements.pagination) return;
            const pageCount = Math.ceil(totalItems / this.itemsPerPage);
            const current = this.currentPage;
            if (pageCount <= 1) {
                this.elements.pagination.innerHTML = '';
                return;
            }
            let html = '';
            html += `<button class="arrow-btn" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>‹</button>`;
            if (pageCount <= 7) {
                for (let i = 1; i <= pageCount; i++) {
                    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
            } else {
                html += `<button class="page-btn ${1 === current ? 'active' : ''}" data-page="1">1</button>`;
                if (current > 4) html += `<span class="ellipsis">...</span>`;
                let start = Math.max(2, current - 1);
                let end = Math.min(pageCount - 1, current + 1);
                if (current <= 3) end = Math.min(5, pageCount - 1);
                if (current >= pageCount - 2) start = Math.max(pageCount - 4, 2);
                for (let i = start; i <= end; i++) {
                    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
                if (current < pageCount - 3) html += `<span class="ellipsis">...</span>`;
                if (pageCount > 1) html += `<button class="page-btn ${pageCount === current ? 'active' : ''}" data-page="${pageCount}">${pageCount}</button>`;
            }
            html += `<button class="arrow-btn" data-page="${current + 1}" ${current >= pageCount ? 'disabled' : ''}>›</button>`;
            this.elements.pagination.innerHTML = html;
        },

        createUserCardHTML(card) {
            const skillsHTML = (card.skills || []).map(skill =>
                `<div class="cv-skill-tag">${skill}</div>`
            ).join('');
            let photoContent = 'Фото';
            if (card.photoUrl) {
                photoContent = `<img src="${card.photoUrl}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.style.display='none'; this.parentElement.innerHTML='Ошибка загрузки фото';">`;
            }
            const cvButtonText = card.cvUrl ? 'Скачать CV' : 'CV отсутствует';
            const cvButtonDisabled = card.cvUrl ? '' : 'disabled';
            return `
                <div class="cv-card">
                    <div class="card-header">
                        <div class="logo-place">${photoContent}</div>
                        <div class="job-title-info">
                            <h2>${card.name ?? ''}</h2>
                            <h2>${card.surname ?? ''}</h2>
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
                    <div class="card-files-info">
                        <small style="color: #666;">
                            ${card.photoFileName || 'Фото не загружено'} |
                            ${card.cvFileName || 'CV не загружено'}
                        </small>
                    </div>
                    <div class="buttoms">
                        <button class="apply-button" onclick="window.open('${card.cvUrl}','_blank')" ${cvButtonDisabled}>${cvButtonText}</button>
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
});
