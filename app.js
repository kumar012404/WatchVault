import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
const animeCollection = collection(db, 'anime');

// DOM Elements
const animeList = document.getElementById('anime-list');
const featuredList = document.getElementById('featured-list');
const featuredSection = document.getElementById('continue-watching-section');
const animeForm = document.getElementById('anime-form');
const animeModal = document.getElementById('anime-modal');
const addBtn = document.getElementById('add-btn');
const closeModal = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const saveBtnText = document.getElementById('save-btn-text');
const imageUrlInput = document.getElementById('image-url-input');
const imageUrlHidden = document.getElementById('image-url-hidden');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const typeFilter = document.getElementById('type-filter');
const trackerModal = document.getElementById('tracker-modal');
const episodeChecklist = document.getElementById('episode-checklist');
const trackerTitle = document.getElementById('tracker-title');
const trackerSubtitle = document.getElementById('tracker-subtitle');
const closeTracker = document.getElementById('close-tracker');
const totalEpisodesInput = document.getElementById('total-episodes');
const typeInput = document.getElementById('type');
const seasonEpisodeRow = document.getElementById('season-episode-row');
const statTotal = document.getElementById('stat-total');
const statWatching = document.getElementById('stat-watching');
const statCompleted = document.getElementById('stat-completed');
const ratingModal = document.getElementById('rating-modal');
const modalStars = document.querySelectorAll('#modal-star-group i');
const saveRatingBtn = document.getElementById('save-rating');
const cancelRatingBtn = document.getElementById('cancel-rating');
const ratingModalTitle = document.getElementById('rating-modal-title');

// State
let isEditing = false;
let currentEditId = null;
let allAnimeData = []; // Local cache for filtering
let ratingContext = null; // Store id, sKey, i for modal callback

console.log("App loaded...");
if (!window.firebaseConfig || window.firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.error("Firebase config is missing or invalid!");
    alert("Firebase properly setup pannala! Index.html check pannunga.");
}

// Open Modal
addBtn.addEventListener('click', () => {
    console.log("Add button clicked!");
    isEditing = false;
    currentEditId = null;
    modalTitle.innerText = 'Add New Item';
    saveBtnText.innerText = 'Add to List';
    animeForm.reset();
    animeModal.classList.add('active');
});

// Close Modal
const hideModal = () => {
    animeModal.classList.remove('active');
    seasonEpisodeRow.style.display = 'grid'; // Reset for next time
};
const hideTracker = () => {
    trackerModal.classList.remove('active');
};
closeModal.addEventListener('click', hideModal);
closeTracker.addEventListener('click', hideTracker);
window.addEventListener('click', (e) => {
    if (e.target === animeModal) hideModal();
    if (e.target === trackerModal) hideTracker();
    if (e.target === ratingModal) hideRatingModal();
});

const hideRatingModal = () => {
    ratingModal.classList.remove('active');
    ratingContext = null;
};

cancelRatingBtn.addEventListener('click', () => {
    if (ratingContext && ratingContext.callback) {
        ratingContext.callback(0); // Save with 0 if skipped
    }
    hideRatingModal();
});

// Star selection logic for modal using event delegation (to handle Lucide SVGs)
document.getElementById('modal-star-group').addEventListener('click', (e) => {
    const star = e.target.closest('[data-value]');
    if (!star) return;

    const val = Number(star.getAttribute('data-value'));
    const allStars = document.querySelectorAll('#modal-star-group [data-value]');

    allStars.forEach(s => {
        if (Number(s.getAttribute('data-value')) <= val) s.classList.add('active');
        else s.classList.remove('active');
    });
});

saveRatingBtn.addEventListener('click', () => {
    const allStars = Array.from(document.querySelectorAll('#modal-star-group [data-value]'));
    const activeStar = allStars.reverse().find(s => s.classList.contains('active'));
    const val = activeStar ? Number(activeStar.getAttribute('data-value')) : 0;
    if (ratingContext && ratingContext.callback) {
        ratingContext.callback(val);
    }
    hideRatingModal();
});

function openRatingPicker(title, currentVal, callback) {
    ratingModalTitle.innerText = title;
    ratingContext = { callback };
    const allStars = document.querySelectorAll('#modal-star-group [data-value]');
    allStars.forEach(s => {
        if (Number(s.getAttribute('data-value')) <= currentVal) s.classList.add('active');
        else s.classList.remove('active');
    });
    ratingModal.classList.add('active');

    // Refresh icons inside modal
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Toggle Season/Episode inputs based on type
const toggleFormFields = () => {
    if (typeInput.value === 'Movie') {
        seasonEpisodeRow.style.display = 'none';
        // Set defaults for movies
        document.getElementById('season').value = 1;
        document.getElementById('episode').value = 1;
        totalEpisodesInput.value = 1;
    } else {
        seasonEpisodeRow.style.display = 'grid';
    }
};

typeInput.addEventListener('change', toggleFormFields);

// Handle Form Submit
animeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('type').value;
    const name = document.getElementById('name').value;
    const season = document.getElementById('season').value;
    const episode = document.getElementById('episode').value;
    const totalEpisodes = totalEpisodesInput.value;
    const status = document.getElementById('status').value;
    saveBtnText.innerText = 'Processing...';

    // Image URL logic
    let finalImageUrl = imageUrlInput.value || 'https://images.unsplash.com/photo-1578632738981-4330c008c90a?q=80&w=1000&auto=format&fit=crop';
    if (!imageUrlInput.value && imageUrlHidden.value) {
        finalImageUrl = imageUrlHidden.value;
    }

    try {
        if (isEditing) {
            const animeRef = doc(db, 'anime', currentEditId);
            const docSnap = await getDoc(animeRef);
            let seasonHistory = docSnap.exists() ? (docSnap.data().seasonHistory || {}) : {};

            // Update current season's total in history
            if (totalEpisodes) {
                seasonHistory[season] = Number(totalEpisodes);
            }

            await updateDoc(animeRef, {
                type,
                name,
                image: finalImageUrl,
                season: Number(season),
                episode: Number(episode),
                totalEpisodes: totalEpisodes ? Number(totalEpisodes) : null,
                seasonHistory: seasonHistory,
                status,
                updatedAt: serverTimestamp()
            });
            console.log("Document updated successfully!");
        } else {
            const seasonHistory = {};
            if (totalEpisodes) {
                seasonHistory[season] = Number(totalEpisodes);
            }

            await addDoc(animeCollection, {
                type,
                name,
                image: finalImageUrl,
                season: Number(season),
                episode: Number(episode),
                totalEpisodes: totalEpisodes ? Number(totalEpisodes) : null,
                seasonHistory: seasonHistory,
                status,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log("New document added successfully!");
        }
        hideModal();
        animeForm.reset();
        imageUrlInput.value = '';
        imageUrlHidden.value = '';
        console.log("Form reset and modal closed.");
    } catch (error) {
        console.error("Database Update Error:", error);
        alert("Update failed! Check internet connection.");
    } finally {
        saveBtnText.innerText = isEditing ? 'Update Changes' : 'Add to List';
    }
});

// Delete Anime
window.deleteAnime = async (id) => {
    if (confirm('Are you sure you want to delete this?')) {
        try {
            await deleteDoc(doc(db, 'anime', id));
        } catch (error) {
            console.error("Error deleting: ", error);
        }
    }
};

// Edit Anime
window.editAnime = (id, name, image, season, episode, status) => {
    isEditing = true;
    currentEditId = id;
    modalTitle.innerText = 'Edit Details';
    saveBtnText.innerText = 'Update Changes';

    const anime = allAnimeData.find(a => a.id === id);
    document.getElementById('type').value = anime?.type || 'Anime';
    document.getElementById('name').value = name;
    imageUrlHidden.value = image || '';
    imageUrlInput.value = image || '';
    document.getElementById('season').value = season;
    document.getElementById('episode').value = episode;
    totalEpisodesInput.value = allAnimeData.find(a => a.id === id)?.totalEpisodes || '';
    document.getElementById('status').value = status;

    toggleFormFields();
    animeModal.classList.add('active');
};

// Quick Episode +1
window.incrementEpisode = async (id, currentEp) => {
    try {
        const animeRef = doc(db, 'anime', id);
        const docSnap = await getDoc(animeRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const nextEp = Number(currentEp) + 1;
        let totalEps = data.totalEpisodes || 12;
        const currentS = data.season || 1;

        // Automatically expand the season if + is clicked beyond the current total
        if (nextEp > totalEps) {
            totalEps = nextEp; // Expand the limit
        }

        openRatingPicker(`Episode ${nextEp} Rating`, 8, async (rating) => {
            let history = data.seasonHistory || {};

            // Sync the expanded total to history for this season
            if (!history[currentS]) {
                history[currentS] = { label: `Season ${currentS}`, total: totalEps, epRatings: {} };
            } else {
                if (typeof history[currentS] === 'number') {
                    history[currentS] = { label: `Season ${currentS}`, total: totalEps, epRatings: {} };
                } else {
                    history[currentS].total = totalEps; // Update the object's total
                }
            }

            if (rating > 0) history[currentS].epRatings[nextEp] = rating;

            const allRatings = [];
            Object.values(history).forEach(s => {
                const epRatings = typeof s === 'object' && s !== null ? s.epRatings : {};
                if (epRatings) Object.values(epRatings).forEach(r => allRatings.push(r));
            });
            const avg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b) / allRatings.length).toFixed(1) : 0;

            await updateDoc(animeRef, {
                episode: nextEp,
                totalEpisodes: totalEps, // Save the expanded total
                seasonHistory: history,
                rating: Number(avg),
                updatedAt: serverTimestamp()
            });
            console.log("Episode incremented with rating!");
        });
    } catch (error) {
        console.error("Error incrementing episode:", error);
    }
};

window.incrementSeason = async (id, currentSeason) => {
    const nextSNum = Number(currentSeason) + 1;
    const customLabel = prompt(`Pudhu Part-oda Name enna? (Ex: Season ${nextSNum}, Movie 1, Special)`, `Season ${nextSNum}`);
    if (!customLabel) return;

    const newTotal = prompt(`Indha "${customLabel}"-la motham evlo episodes/parts irukku?`, "12");

    try {
        const animeRef = doc(db, 'anime', id);
        const docSnap = await getDoc(animeRef);
        let seasonHistory = docSnap.exists() ? (docSnap.data().seasonHistory || {}) : {};

        // Save as object with label, total AND ratings storage
        seasonHistory[nextSNum] = {
            label: customLabel,
            total: newTotal ? Number(newTotal) : 1,
            epRatings: {}
        };

        await updateDoc(animeRef, {
            season: nextSNum,
            episode: 1,
            totalEpisodes: newTotal ? Number(newTotal) : 1,
            seasonHistory: seasonHistory,
            updatedAt: serverTimestamp()
        });
        console.log("Franchise part added!");
    } catch (error) {
        console.error("Error incrementing franchise:", error);
    }
};

window.openEpisodeTracker = (id) => {
    const anime = allAnimeData.find(a => a.id === id);
    if (!anime) return;

    const history = anime.seasonHistory || {};
    const currentS = anime.season;
    const currentE = anime.episode;

    trackerTitle.innerText = anime.name;
    trackerSubtitle.innerText = "Franchise Progress & Episode Ratings";
    episodeChecklist.innerHTML = '';

    const seasons = Object.keys(history).sort((a, b) => Number(a) - Number(b));

    if (seasons.length === 0) {
        episodeChecklist.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 2rem;">No data found. Add details in Edit.</p>';
    }

    seasons.forEach(sKey => {
        const sData = history[sKey];
        // Handle backward compatibility (old data: number, new data: object)
        const sLabel = typeof sData === 'object' ? sData.label : `Season ${sKey}`;
        const sTotal = typeof sData === 'object' ? sData.total : sData;
        const epRatings = typeof sData === 'object' ? (sData.epRatings || {}) : {};

        const seasonHeader = document.createElement('div');
        seasonHeader.className = 'season-header-in-list';
        seasonHeader.innerHTML = `<h4>${sLabel} <span style="font-weight: 400; font-size: 0.8rem; color: var(--accent-secondary);">(${sTotal} Eps)</span></h4>`;
        episodeChecklist.appendChild(seasonHeader);

        const grid = document.createElement('div');
        grid.className = 'episode-checklist-grid';
        grid.style.marginBottom = '1.5rem';

        for (let i = 1; i <= sTotal; i++) {
            let status = 'unwatched';
            if (Number(sKey) < currentS) status = 'watched';
            else if (Number(sKey) == currentS) {
                if (i < currentE) status = 'watched';
                else if (i == currentE) status = 'current';
            }

            // Show individual rating if exists
            const r = epRatings[i];
            const item = document.createElement('div');
            item.className = `episode-item ${status} ${r ? 'rated' : ''}`;

            item.innerHTML = `<span>${i}</span>${r ? `<span style="font-size: 0.6rem; color: #ffc107; display: block; margin-top: 2px;">★${r}</span>` : ''}`;

            item.onclick = async () => {
                // If already has rating, just update progress without asking again
                if (r) {
                    try {
                        const animeRef = doc(db, 'anime', id);
                        await updateDoc(animeRef, {
                            season: Number(sKey),
                            episode: i,
                            totalEpisodes: sTotal,
                            updatedAt: serverTimestamp()
                        });
                        setTimeout(hideTracker, 300);
                    } catch (err) {
                        console.error("Progress update failed:", err);
                    }
                    return;
                }

                openRatingPicker(`Episode ${i} Rating`, 8, async (epRating) => {
                    try {
                        const animeRef = doc(db, 'anime', id);
                        const freshSnap = await getDoc(animeRef);
                        let freshHistory = freshSnap.data().seasonHistory || {};

                        if (!freshHistory[sKey]) freshHistory[sKey] = { label: sLabel, total: sTotal, epRatings: {} };
                        else if (typeof freshHistory[sKey] === 'number') freshHistory[sKey] = { label: sLabel, total: freshHistory[sKey], epRatings: {} };
                        if (!freshHistory[sKey].epRatings) freshHistory[sKey].epRatings = {};

                        if (epRating > 0) freshHistory[sKey].epRatings[i] = Number(epRating);

                        const allR = [];
                        Object.values(freshHistory).forEach(s => {
                            const currentEpRatings = typeof s === 'object' && s !== null ? s.epRatings : {};
                            if (currentEpRatings) Object.values(currentEpRatings).forEach(val => allR.push(val));
                        });
                        const newAvg = allR.length > 0 ? (allR.reduce((a, b) => a + b) / allR.length).toFixed(1) : 0;

                        await updateDoc(animeRef, {
                            season: Number(sKey),
                            episode: i,
                            totalEpisodes: sTotal,
                            seasonHistory: freshHistory,
                            rating: Number(newAvg),
                            updatedAt: serverTimestamp()
                        });

                        setTimeout(hideTracker, 300);
                    } catch (err) {
                        console.error("Tracker update failed:", err);
                    }
                });
            };
            grid.appendChild(item);
        }
        episodeChecklist.appendChild(grid);
    });

    trackerModal.classList.add('active');
};

// Real-time listener
const q = query(animeCollection, orderBy('updatedAt', 'desc'));

onSnapshot(q, (snapshot) => {
    allAnimeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateStatsDashboard();
    applyFilters();
});

// Update stats dashboard
function updateStatsDashboard() {
    statTotal.innerText = allAnimeData.length;
    statWatching.innerText = allAnimeData.filter(a => a.status === 'Watching').length;
    statCompleted.innerText = allAnimeData.filter(a => a.status === 'Completed').length;
}

// Filter & Search Logic
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = statusFilter.value;
    const filterType = typeFilter.value;

    const filtered = allAnimeData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        const matchesType = filterType === 'All' || (item.type || 'Anime') === filterType;
        return matchesSearch && matchesStatus && matchesType;
    });

    renderAnime(filtered, searchTerm || filterStatus !== 'All' || filterType !== 'All');
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);

// Render logic
function renderAnime(data, isFiltered) {
    animeList.innerHTML = '';
    featuredList.innerHTML = '';

    if (data.length > 0) {
        // Continue Watching (Latest updated) - Only show if not searching/filtering
        if (!isFiltered) {
            featuredSection.style.display = 'block';
            const latest = data[0];
            featuredList.innerHTML = createCard(latest, true);

            // Full List (Excluding the one in Featured)
            data.slice(1).forEach(anime => {
                animeList.innerHTML += createCard(anime, false);
            });
        } else {
            featuredSection.style.display = 'none';
            // Show all matches in the main grid
            data.forEach(anime => {
                animeList.innerHTML += createCard(anime, false);
            });
        }
    } else {
        featuredSection.style.display = 'none';
        animeList.innerHTML = `<p style="color: var(--text-dim); grid-column: 1/-1; text-align: center; padding: 3rem;">
            ${isFiltered ? 'No matching items found.' : 'No items found. Press "Add New" to start tracking!'}
        </p>`;
    }

    // Re-initialize icons for new elements
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function createCard(anime, isFeatured) {
    const statusClass = `status-${anime.status.toLowerCase()}`;
    // Use Total Episodes for progress if available, otherwise fallback to 12
    const total = anime.totalEpisodes || 12;
    const progress = Math.min((anime.episode / total) * 100, 100);

    return `
        <div class="anime-card ${statusClass}" style="animation-delay: ${isFeatured ? '0s' : '0.1s'}">
            ${anime.rating > 0 ? `
                <div class="rating-badge">
                    <i data-lucide="star"></i>
                    <span>${anime.rating}</span>
                </div>
            ` : ''}
            <img src="${anime.image}" class="card-banner" alt="${anime.name}" onerror="this.src='https://images.unsplash.com/photo-1578632738981-4330c008c90a?q=80&w=1000&auto=format&fit=crop'">
            <div class="card-body">
                <div class="anime-info">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 1px; display: block; margin-bottom: 2px;">${anime.type || 'Anime'}</span>
                            <h3 title="${anime.name}">${anime.name}</h3>
                        </div>
                        ${anime.type !== 'Movie' ? `
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="font-size: 0.7rem; color: var(--accent-secondary); border: 1px solid var(--accent-secondary); padding: 2px 6px; border-radius: 4px;">S${anime.season}</span>
                            <button class="btn-quick-add" style="background: var(--accent-primary);" onclick="event.stopPropagation(); incrementSeason('${anime.id}', ${anime.season})" title="Next Season">
                                <i data-lucide="chevrons-up"></i>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    <div class="anime-meta" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        ${anime.type !== 'Movie' ? `
                            <div style="display: flex; align-items: center; gap: 0.3rem;">
                                <span style="font-weight: 500;">Ep ${anime.episode}</span>
                                <button class="btn-quick-add" style="background: var(--accent-secondary); width: 18px; height: 18px; padding: 0;" onclick="event.stopPropagation(); incrementEpisode('${anime.id}', ${anime.episode})" title="Episode +1">
                                    <i data-lucide="plus" style="width: 12px; height: 12px;"></i>
                                </button>
                            </div>
                            <span>•</span>
                        ` : ''}
                        <span style="color: var(--text-dim); font-size: 0.8rem;">${anime.status}</span>
                    </div>
                    ${anime.type !== 'Movie' ? `
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                    ` : ''}
                </div>
                    <div class="card-actions">
                        <button class="btn-icon btn-checklist" onclick="event.stopPropagation(); openEpisodeTracker('${anime.id}')" title="Full Series Tracker">
                            <i data-lucide="list-checks"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="editAnime('${anime.id}', '${anime.name.replace(/'/g, "\\'")}', '${anime.image}', ${anime.season}, ${anime.episode}, '${anime.status}')">
                            <i data-lucide="edit-3"></i>
                        </button>
                    <button class="btn-icon btn-delete" onclick="deleteAnime('${anime.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}
