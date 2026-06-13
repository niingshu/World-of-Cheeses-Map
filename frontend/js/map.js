const map = L.map('cheese-world-map').setView([20, 10], 2);
const bounds = [];
const cheesesMap = new Map();
const clusters = L.markerClusterGroup();
let selectedMarker = null;
let isFiltered = false;
let selectedCheese = null;
let miniMap = null;
let miniMapToken = 0;
let countriesGeoJSON = null;
let miniMapCountryLayer = null;
let allCheeses = [];
let pairingInfo = {};

fetch('data/pairing_info.json')
    .then(r => r.json())
    .then(data => { pairingInfo = data; })
    .catch(err => console.error('Failed to load pairing info:', err));

function updateMiniMapColors() {
    if (!miniMapCountryLayer) return;
    const isDark = document.body.classList.contains('dark-mode');
    miniMapCountryLayer.setStyle({
        fillColor: isDark ? '#2e426c' : '#ddb45a',
        color: isDark ? '#4a6498' : '#d0a84e',
    });
}

fetch('data/countries.geo.json')
    .then(r => r.json())
    .then(data => { countriesGeoJSON = data; })
    .catch(err => console.error('Failed to load countries GeoJSON:', err));

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

//making cheese marker
var cheeseSpot = L.icon({
    iconUrl: 'images/cheese.png',
    shadowUrl: null,

    iconSize:       [25, 37], //size of the icon
    shadowSize:     [30, 60], //size of the shadow
    iconAnchor:     [9, 29], //point of the icon which correspond to marker's location 
    shadowAnchor:   [4, 62], //same for shadow
    popupAnchor:    [-3, -15] // point from which popup should open relative to the iconAnchor
});


var highlightCheese = L.icon({
    iconUrl: 'images/chosenCheese.png',
    shadowUrl: null,

    iconSize:       [25*1.5, 30*1.5], 
    shadowSize:     [30, 60], 
    iconAnchor:     [15*1.5, 25*1.5], 
    shadowAnchor:   [4, 62], 
    popupAnchor:    [-3*1.5, -20*1.5]
});

function showPairingDetail(itemName, cheese) {
    const panel = document.getElementById('cheese-panel');
    const info = pairingInfo[itemName] || {};

    panel.innerHTML = '';

    const closeBtn = document.createElement('a');
    closeBtn.className = 'closebtn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        panel.style.width = '0';
        panel.style.padding = '10px 0';
    });
    panel.appendChild(closeBtn);

    const card = document.createElement('div');
    card.className = 'cheese-card';

    const backBtn = document.createElement('button');
    backBtn.className = 'pairing-back-btn';
    backBtn.textContent = '←';
    backBtn.addEventListener('click', () => {
        cheesePanel(cheese);
    });
    card.appendChild(backBtn);

    const title = document.createElement('h2');
    title.className = 'name pairing-detail-title';
    title.textContent = itemName;
    card.appendChild(title);

    if (info.image) {
        const img = document.createElement('img');
        img.src = info.image;
        img.alt = itemName;
        img.className = 'panel-image';
        card.appendChild(img);
    }

    if (info.description) {
        const descHeader = document.createElement('h3');
        descHeader.className = 'panel-section-header';
        descHeader.textContent = 'Description';
        card.appendChild(descHeader);

        const desc = document.createElement('p');
        desc.className = 'panel-section-text';
        desc.textContent = info.description;
        card.appendChild(desc);
    }

    if (info.wiki) {
        const wikiLink = document.createElement('a');
        wikiLink.href = info.wiki;
        wikiLink.target = '_blank';
        wikiLink.className = 'cheese-link-btn';
        wikiLink.textContent = 'Read more on Wikipedia';
        card.appendChild(wikiLink);
    }

    panel.appendChild(card);
}

function findSimilarCheeses(cheese, max) {
    const types = (cheese.type || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
    const milk = (cheese.milk || '').toLowerCase().trim();

    return allCheeses
        .filter(c => {
            if (c._id === cheese._id) return false;
            if (!c.type || !c.milk) return false;
            const cMilk = c.milk.toLowerCase().trim();
            if (cMilk !== milk) return false;
            const cTypes = c.type.toLowerCase().split(',').map(t => t.trim());
            return types.some(t => cTypes.includes(t));
        })
        .slice(0, max);
}

async function initMap() {
    const data = await fetchCheeses()
    allCheeses = data;

    data.forEach(cheese => {
        if (!cheese.lat || !cheese.lon) return; //skip the rest 

        bounds.push([cheese.lat, cheese.lon]);

        const region = (!cheese.region || cheese.region === "NA" || cheese.region === "N/A") 
            ? "" 
            : cheese.region;

        const tooltip = region 
            ? `${cheese.cheese} (${region}, ${cheese.country})`
            : `${cheese.cheese} (${cheese.country})`;

        const marker = L.marker([cheese.lat, cheese.lon], { icon: cheeseSpot })
            .bindTooltip(tooltip);
        
        clusters.addLayer(marker); //add marker to cluster group 

        cheesesMap.set(cheese._id, marker);

        marker.on('click', () => {
            onCheeseClick(cheese, marker);
            clusters.zoomToShowLayer(marker, () => {
                map.panTo(marker.getLatLng());
            });
        });
    });

    map.addLayer(clusters);

    if (bounds.length > 0) map.fitBounds(bounds);
}

function onCheeseClick(chosenCheese, marker) {
    var clickedMarker = marker;

    if (selectedMarker && selectedMarker !== clickedMarker) {
        selectedMarker.setIcon(cheeseSpot);
    }

    //set clicked marker's icon to highlight
    clickedMarker.setIcon(highlightCheese);

    //update the selected marker reference
    selectedMarker = clickedMarker;
    selectedCheese = chosenCheese
    
    cheesePanel(selectedCheese); //passing in the selected cheese
}

function cheesePanel(chosenCheese) {
    const panel = document.getElementById('cheese-panel');

    if (miniMap) {
        miniMap.remove();
        miniMap = null;
    }

    panel.innerHTML = '';

    const closeBtn = document.createElement('a');
    closeBtn.className = 'closebtn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        panel.style.width = '0';
        panel.style.padding = '10px 0';
    });
    panel.appendChild(closeBtn);

    const card = document.createElement('div');
    card.className = 'cheese-card';
    card.setAttribute('data-id', chosenCheese._id);

    const title = document.createElement('h2');
    title.className = 'name';
    title.textContent = chosenCheese.cheese;
    card.appendChild(title);

    const cheeseImg = document.createElement('img');
    cheeseImg.src = chosenCheese.image || 'images/no-cheese.jpg';
    cheeseImg.className = 'panel-image';
    card.appendChild(cheeseImg);

    const region = (!chosenCheese.region || chosenCheese.region === "NA" || chosenCheese.region === "N/A")
        ? ""
        : chosenCheese.region;

    const bodyRow = document.createElement('div');
    bodyRow.className = 'panel-body';

    const fieldsCol = document.createElement('div');
    fieldsCol.className = 'panel-fields';

    const fields = [
        ['Country', chosenCheese.country],
        ['Region', region],
        ['Milk', chosenCheese.milk],
        ['Type', chosenCheese.type],
        ['Texture', chosenCheese.texture],
        ['Color', chosenCheese.color],
        ['Flavor', chosenCheese.flavor],
    ];

    fields.forEach(([label, value]) => {
        if (!value || value === 'NA' || value === 'N/A') return;
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(value.charAt(0).toUpperCase() + value.slice(1)));
        fieldsCol.appendChild(p);
    });

    bodyRow.appendChild(fieldsCol);

    const isMultiCountry = chosenCheese.country && chosenCheese.country.includes(',');

    const rightCol = document.createElement('div');
    rightCol.className = 'panel-minimap-container';

    if (isMultiCountry) {
        const flagGrid = document.createElement('div');
        flagGrid.className = 'panel-flag-grid';

        const countries = chosenCheese.country.split(',').map(c => c.trim());
        countries.forEach(country => {
            const code = getCountryCode(country);
            if (!code) return;
            const flagImg = document.createElement('img');
            flagImg.src = `https://flagcdn.com/w80/${code}.png`;
            flagImg.alt = `${country} flag`;
            flagImg.className = 'panel-flag';
            flagImg.onerror = () => { flagImg.style.display = 'none'; };
            flagGrid.appendChild(flagImg);
        });

        rightCol.appendChild(flagGrid);
    } else {
        const flagUrl = getFlagUrl(chosenCheese.country);
        if (flagUrl) {
            const flagImg = document.createElement('img');
            flagImg.src = flagUrl;
            flagImg.alt = `${chosenCheese.country} flag`;
            flagImg.className = 'panel-flag';
            flagImg.onerror = () => { flagImg.style.display = 'none'; };
            rightCol.appendChild(flagImg);
        }

        const miniMapDiv = document.createElement('div');
        miniMapDiv.id = 'panel-minimap';
        rightCol.appendChild(miniMapDiv);
    }

    bodyRow.appendChild(rightCol);

    card.appendChild(bodyRow);

    const hasSections = chosenCheese.description || chosenCheese.manufacture || (chosenCheese.pairings && chosenCheese.pairings.length);
    if (hasSections) {
        const divider = document.createElement('hr');
        divider.className = 'panel-divider';
        card.appendChild(divider);
    }

    if (chosenCheese.description) {
        const descHeader = document.createElement('h3');
        descHeader.className = 'panel-section-header';
        descHeader.textContent = 'Description';
        card.appendChild(descHeader);

        const descText = document.createElement('p');
        descText.className = 'panel-section-text';
        descText.textContent = chosenCheese.description;
        card.appendChild(descText);
    }

    if (chosenCheese.manufacture) {
        const histHeader = document.createElement('h3');
        histHeader.className = 'panel-section-header';
        histHeader.textContent = 'How It\'s Made';
        card.appendChild(histHeader);

        const histText = document.createElement('p');
        histText.className = 'panel-section-text';
        histText.textContent = chosenCheese.manufacture;
        card.appendChild(histText);
    }

    if (chosenCheese.pairings && chosenCheese.pairings.length) {
        const pairHeader = document.createElement('h3');
        pairHeader.className = 'panel-section-header';
        pairHeader.textContent = 'Pairs Well With';
        card.appendChild(pairHeader);

        const pairList = document.createElement('ul');
        pairList.className = 'panel-pairing-list';
        chosenCheese.pairings.forEach(item => {
            const li = document.createElement('li');
            const link = document.createElement('span');
            link.className = 'pairing-link';
            link.textContent = item;
            link.addEventListener('click', () => showPairingDetail(item, chosenCheese));
            li.appendChild(link);
            pairList.appendChild(li);
        });
        card.appendChild(pairList);
    }

    const similar = findSimilarCheeses(chosenCheese, 6);
    if (similar.length) {
        const simHeader = document.createElement('h3');
        simHeader.className = 'panel-section-header';
        simHeader.textContent = 'Browse Similar Cheeses';
        card.appendChild(simHeader);

        const simGrid = document.createElement('div');
        simGrid.className = 'similar-cheese-grid';
        similar.forEach(sim => {
            const item = document.createElement('span');
            item.className = 'similar-cheese-item';
            item.textContent = sim.cheese;
            item.addEventListener('click', () => {
                const marker = cheesesMap.get(sim._id);
                if (marker) {
                    onCheeseClick(sim, marker);
                    clusters.zoomToShowLayer(marker, () => {
                        map.panTo(marker.getLatLng());
                    });
                }
            });
            simGrid.appendChild(item);
        });
        card.appendChild(simGrid);
    }

    const link = document.createElement('a');
    link.href = chosenCheese.url;
    link.target = '_blank';
    link.className = 'cheese-link-btn';
    link.textContent = 'View on cheese.com';
    card.appendChild(link);

    panel.appendChild(card);

    panel.style.padding = '10px 20px';
    panel.style.width = '33vw';

    if (!isMultiCountry) {
        const currentToken = ++miniMapToken;
        setTimeout(() => {
            if (currentToken !== miniMapToken) return;
            const container = document.getElementById('panel-minimap');
            if (!container) return;

            miniMap = L.map('panel-minimap', {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                touchZoom: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                boxZoom: false,
                keyboard: false,
            });

            const geoName = getGeoJSONCountryName(chosenCheese.country);
            let countryFeature = null;
            if (countriesGeoJSON && geoName) {
                countryFeature = countriesGeoJSON.features.find(
                    f => f.properties.name === geoName
                );
            }

            if (countryFeature) {
                const isDark = document.body.classList.contains('dark-mode');
                const fillColor = isDark ? '#2e426c' : '#ddb45a';
                const strokeColor = isDark ? '#4a6498' : '#d0a84e';
                const regionColor = '#8b1a1a';

                miniMapCountryLayer = L.geoJSON(countryFeature, {
                    style: {
                        fillColor: fillColor,
                        fillOpacity: 0.85,
                        color: strokeColor,
                        weight: 1.5,
                    },
                }).addTo(miniMap);

                miniMap.fitBounds(miniMapCountryLayer.getBounds(), { padding: [10, 10] });

                if (region && chosenCheese.lat && chosenCheese.lon) {
                    L.circle([chosenCheese.lat, chosenCheese.lon], {
                        radius: 50000,
                        color: regionColor,
                        fillColor: regionColor,
                        fillOpacity: 0.5,
                        weight: 2,
                    }).addTo(miniMap);
                }
            } else {
                miniMap.setView([chosenCheese.lat || 20, chosenCheese.lon || 10], 5);
            }

            miniMap.invalidateSize();
        }, 350);
    }
}

initMap();