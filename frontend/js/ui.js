//user types in search box, grab input value, build API URL with params
//fetch new results
//clear existing markers from map
//loop through results and add new markers

function closePanel() {
    const panel = document.getElementById('cheese-panel');
    panel.style.width = '0';
    panel.style.padding = '10px 0';
    if (selectedMarker) {
        selectedMarker.setIcon(cheeseSpot);
        selectedMarker = null;
        selectedCheese = null;
    }
}

//filter box
document.addEventListener('DOMContentLoaded', () => {
    const countryList = document.getElementById('countryList');
    const filterBtn = document.getElementById('filterBtn');

    filterBtn.addEventListener('click', () => {
        closePanel();
        const isHidden = countryList.style.display === 'none';
        countryList.style.display = isHidden ? 'block' : 'none';
    });

    fetch(`${API_BASE}/api/cheeses/countries`)
        .then(response => response.json())
        .then(countries => {
            //add "Show All" option at the top
            const allLi = document.createElement('li');
            allLi.textContent = 'Show All';
            allLi.dataset.value = '';
            countryList.appendChild(allLi);

            countries.forEach(country => {
                const li = document.createElement('li');
                li.textContent = country;
                li.dataset.value = country;
                countryList.appendChild(li);
            })
        })
        .catch(error => console.error('Error fetching countries: ', error));

    //user clicked a country from the list
    countryList.addEventListener('click', (event) => {
        const li = event.target.closest('li');
        if (!li) return;

        const selectedValue = li.dataset.value;

        closePanel();

        //highlight the active item and hide the list
        countryList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        countryList.style.display = 'none';
        filterBtn.textContent = selectedValue || 'Filter By Country';

        clusters.clearLayers();
        cheesesMap.clear();
        isFiltered = !!selectedValue;

        const url = selectedValue
            ? `${API_BASE}/api/cheeses?country=${encodeURIComponent(selectedValue)}`
            : `${API_BASE}/api/cheeses`;

        fetch(url)
            .then(response => response.json())
            .then(cheeses => {
                cheeses.forEach(cheese => {
                    if (!cheese.lat || !cheese.lon) return;

                    const region = (!cheese.region || cheese.region === "NA" || cheese.region === "N/A")
                        ? ""
                        : cheese.region;

                    const tooltip = region
                        ? `${cheese.cheese} (${region}, ${cheese.country})`
                        : `${cheese.cheese} (${cheese.country})`;

                    const marker = L.marker([cheese.lat, cheese.lon], { icon: cheeseSpot })
                        .bindTooltip(tooltip);

                    clusters.addLayer(marker);
                    cheesesMap.set(cheese._id, marker);

                    marker.on('click', () => {
                        onCheeseClick(cheese, marker);
                        clusters.zoomToShowLayer(marker, () => {
                            map.panTo(marker.getLatLng());
                        })
                    });
                })

                const bounds = cheeses
                    .filter(c => c.lat && c.lon)
                    .map(c => [c.lat, c.lon]);
                if (bounds.length > 0) map.flyToBounds(bounds, { padding: [50, 50] });
            })
            .catch(error => console.error('Error fetching cheeses: ', error));
    
    });


});

//search box
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultList = document.getElementById('resultList');
    let debounceTimer;

    searchInput.addEventListener('input', (event) => {
        //reset the map
        initMap()
        resultList.style.maxHeight = '';
        closePanel();

        const query = event.target.value.trim();

        clearTimeout(debounceTimer);

        if (query.length === 0) {
            resultList.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetch(`${API_BASE}/api/cheeses?name=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(cheeses => {
                    resultList.innerHTML = '';
                    cheeses.forEach(item => {
                        const li = document.createElement('li');
                        li.dataset.id = item._id;
                        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                        li.innerHTML = item.cheese.replace(regex, '<b>$1</b>');
                        resultList.appendChild(li);
                    });
                })
                .catch(error => console.error('Error searching cheeses: ', error));
        }, 500);
    });

    resultList.addEventListener('click', (event) => {
        const li = event.target.closest('li');
        if (!li) return;

        const cheeseId = li.dataset.id;

        fetch(`${API_BASE}/api/cheeses/${cheeseId}`)
            .then(response => response.json())
            .then(cheese => {
                const marker = cheesesMap.get(cheese._id);
                if (!marker) return;

                clusters.zoomToShowLayer(marker, () => {
                    onCheeseClick(cheese, marker);
                });

                resultList.style.maxHeight = '0px';
                searchInput.value = '';
            })
            .catch(error => console.error('Error finding cheese: ', error));

    });
})


document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
});

map.on('click', () => {
    closePanel();

    if (isFiltered) {
        isFiltered = false;
        const filterBtn = document.getElementById('filterBtn');
        filterBtn.textContent = 'Filter Cheese By Country';
        document.querySelectorAll('#countryList li').forEach(el => el.classList.remove('active'));
        initMap();
    }
});

// dark/light mode toggle
const moonSVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3a2e1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const sunSVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3a2e1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

document.body.classList.add('dark-mode');
const themeBtn = document.getElementById('themeToggle');
themeBtn.innerHTML = moonSVG;
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.innerHTML = isDark ? moonSVG : sunSVG;
});
