function showResumeOption() {
    const lastSim = window.userPrefs.preferences.lastSimulation;

    if (!lastSim) return;

    const simulation = SIMULATIONS.find(s => s.id === lastSim);

    if (!simulation) return;

    // Create resume banner
    const banner = document.createElement('div');
    banner.className = 'resume-banner';

    banner.innerHTML = `
        <div class="resume-content">
            <div class="resume-icon">▶️</div>

            <div class="resume-text">
                <div class="resume-label">Continue Learning</div>
                <div class="resume-sim">${simulation.title}</div>
            </div>

            <button class="btn-resume">Resume</button>

            <button class="btn-dismiss">×</button>
        </div>
    `;

    const resumeButton = banner.querySelector('.btn-resume');
    const dismissButton = banner.querySelector('.btn-dismiss');

    resumeButton.addEventListener('click', () => {
        openSimulation(simulation);
    });

    dismissButton.addEventListener('click', () => {
        banner.remove();
    });

    const gallery = document.getElementById('gallery-view');

    if (gallery) {
        gallery.insertBefore(banner, gallery.firstChild.nextSibling);
    }
}