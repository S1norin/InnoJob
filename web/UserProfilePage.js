document.addEventListener('DOMContentLoaded', function() {
    const skillsSearch = document.getElementById('skillsSearch');
    const skillsDropdown = document.getElementById('skillsDropdown');
    const selectedSkillsContainer = document.getElementById('selectedSkills');
    const skillsInputWrapper = skillsSearch.parentElement;

    let selectedSkills = [];

    // Показать/скрыть выпадающий список
    skillsSearch.addEventListener('click', function() {
        toggleDropdown();
    });

    skillsSearch.addEventListener('focus', function() {
        showDropdown();
    });

    // Поиск навыков
    skillsSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterSkills(searchTerm);
        showDropdown();
    });

    // Выбор навыка
    skillsDropdown.addEventListener('click', function(e) {
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

    // Закрыть выпадающий список при клике вне его
    document.addEventListener('click', function(e) {
        if (!skillsInputWrapper.contains(e.target) && !skillsDropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    function toggleDropdown() {
        if (skillsDropdown.classList.contains('show')) {
            hideDropdown();
        } else {
            showDropdown();
        }
    }

    function showDropdown() {
        skillsDropdown.classList.add('show');
        skillsInputWrapper.classList.add('active');
    }

    function hideDropdown() {
        skillsDropdown.classList.remove('show');
        skillsInputWrapper.classList.remove('active');
    }

    function filterSkills(searchTerm) {
        const options = skillsDropdown.querySelectorAll('.skills-option');

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.getAttribute('data-value').toLowerCase();

            if (text.includes(searchTerm) || value.includes(searchTerm)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }

            // Скрыть уже выбранные навыки
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
        updateDropdownOptions();
    }

    function removeSkill(value) {
        selectedSkills = selectedSkills.filter(skill => skill.value !== value);
        renderSelectedSkills();
        updateDropdownOptions();
    }

    function renderSelectedSkills() {
        selectedSkillsContainer.innerHTML = '';

        selectedSkills.forEach(skill => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `
                ${skill.text}
                <button type="button" class="skill-remove" onclick="removeSkillByValue('${skill.value}')">×</button>
            `;
            selectedSkillsContainer.appendChild(skillTag);
        });
    }

    function updateDropdownOptions() {
        const options = skillsDropdown.querySelectorAll('.skills-option');
        options.forEach(option => {
            const value = option.getAttribute('data-value');
            if (selectedSkills.some(skill => skill.value === value)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // Глобальная функция для кнопки удаления
    window.removeSkillByValue = function(value) {
        removeSkill(value);
    };
});

