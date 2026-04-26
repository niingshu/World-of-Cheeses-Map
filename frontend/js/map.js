const map = L.map('cheese-world-map').setView([20, 10], 2);
const bounds = [];
const cheesesMap = new Map();
let selectedMarker = null;
let selectedCheese = null;

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

async function initMap() {
    const data = await fetchCheeses()

    //create the cluster group 
    const clusters = L.markerClusterGroup()

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
            map.flyTo(marker.getLatLng(), 6)
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

initMap();