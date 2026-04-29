//user types in search box, grab input value, build API URL with params
//fetch new results
//clear existing markers from map
//loop through results and add new markers

document.addEventListener('DOMContentLoaded', () => {
    const countryList = document.getElementById('countryList');
    const filterBtn = document.getElementById('filterBtn');

    filterBtn.addEventListener('click', () => {
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

        //highlight the active item and hide the list
        countryList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        countryList.style.display = 'none';
        filterBtn.textContent = selectedValue || 'Filter Cheese By Country';

        clusters.clearLayers();
        cheesesMap.clear();

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
                        map.flyTo(marker.getLatLng(), 6)
                    });
                })
            })
            .catch(error => console.error('Error fetching cheeses: ', error));
    
    });

})
