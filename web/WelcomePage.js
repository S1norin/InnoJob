function goToPage() {
    localStorage.setItem('lastFlow', 'job');
    if (localStorage.getItem('userEmail')) {
        window.location.href = '/job_listing';
        return;
    }
    window.location.href = "/log_in_page";
}

function goToEmployerFlow() {
    localStorage.setItem('lastFlow', 'employee');
    if (localStorage.getItem('userEmail')) {
        window.location.href = '/cv_listing_page';
        return;
    }
    localStorage.setItem('employerFlow', '1');
    window.location.href = '/log_in_page';
}

document.addEventListener('DOMContentLoaded', function () {
    const loginLink = document.querySelector('.header-right a[href="/log_in_page"]');
    if (loginLink) {
        loginLink.addEventListener('click', function (e) {
            if (localStorage.getItem('userEmail')) {
                e.preventDefault();
                const lastFlow = localStorage.getItem('lastFlow');
                if (lastFlow === 'employee') {
                    window.location.href = '/cv_listing_page';
                } else {
                    window.location.href = '/job_listing';
                }
            }
        });
    }
});