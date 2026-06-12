const COUNTRY_TO_ISO = {
    'Afghanistan': 'af',
    'Albania': 'al',
    'Argentina': 'ar',
    'Armenia': 'am',
    'Australia': 'au',
    'Austria': 'at',
    'Bangladesh': 'bd',
    'Belgium': 'be',
    'Brazil': 'br',
    'Bulgaria': 'bg',
    'Canada': 'ca',
    'Chile': 'cl',
    'China': 'cn',
    'Croatia': 'hr',
    'Cyprus': 'cy',
    'Czech Republic': 'cz',
    'Denmark': 'dk',
    'Egypt': 'eg',
    'England': 'gb-eng',
    'Finland': 'fi',
    'France': 'fr',
    'Georgia': 'ge',
    'Germany': 'de',
    'Great Britain': 'gb',
    'Greece': 'gr',
    'Holland': 'nl',
    'Hungary': 'hu',
    'Iceland': 'is',
    'India': 'in',
    'Iraq': 'iq',
    'Ireland': 'ie',
    'Israel': 'il',
    'Italy': 'it',
    'Jordan': 'jo',
    'Lebanon': 'lb',
    'Lithuania': 'lt',
    'Macedonia': 'mk',
    'Mauritania': 'mr',
    'Mexico': 'mx',
    'Mexico and Caribbean': 'mx',
    'Mongolia': 'mn',
    'Nepal': 'np',
    'Netherlands': 'nl',
    'New Zealand': 'nz',
    'Norway': 'no',
    'Poland': 'pl',
    'Portugal': 'pt',
    'Romania': 'ro',
    'Scotland': 'gb-sct',
    'Serbia': 'rs',
    'Slovakia': 'sk',
    'Spain': 'es',
    'Sweden': 'se',
    'Switzerland': 'ch',
    'Syria': 'sy',
    'Turkey': 'tr',
    'United Kingdom': 'gb',
    'United States': 'us',
    'Wales': 'gb-wls',
};

const COUNTRY_NAME_TO_GEOJSON = {
    'United States': 'United States of America',
    'Serbia': 'Republic of Serbia',
    'England': 'United Kingdom',
    'Scotland': 'United Kingdom',
    'Wales': 'United Kingdom',
    'Great Britain': 'United Kingdom',
    'Holland': 'Netherlands',
    'Mexico and Caribbean': 'Mexico',
};

function getCountryCode(countryString) {
    if (!countryString) return null;
    const first = countryString.split(',')[0].trim();
    return COUNTRY_TO_ISO[first] || null;
}

function getFlagUrl(countryString) {
    const code = getCountryCode(countryString);
    if (!code) return null;
    return `https://flagcdn.com/w80/${code}.png`;
}

function getGeoJSONCountryName(countryString) {
    if (!countryString) return null;
    const first = countryString.split(',')[0].trim();
    return COUNTRY_NAME_TO_GEOJSON[first] || first;
}
