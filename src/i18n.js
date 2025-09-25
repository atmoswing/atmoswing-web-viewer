import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "panel": {
                "display": "Display",
                "forecasts": "Forecasts",
                "synthesis": "Synthesis",
                "stationSelection": "Station selection",
                "analogDates": "Analog dates",
                "loading": "Loading…",
                "noData": "No data",
                "errorLoading": "Error loading {{what}}"
            },
            "workspace": {
                "noWorkspaces": "No workspaces available. Please check your configuration.",
                "label": "Workspace"
            },
            "stations": {
                "loading": "Loading stations…",
                "errorLoading": "Error loading stations",
                "select": "Select a station"
            },
            "display": {
                "normalization": "Normalization",
                "percentile": "Percentile"
            },
            "synthesis": {
                "normalizedValues": "Normalized values"
            },
            "toolbar": {
                "forecastOf": "Forecast of {{date}}",
                "loading": "Loading...",
                "searching": "Searching..."
            },
            "forecasts": {
                "loading": "Loading..."
            },
            "analog": {
                "columns": {
                    "rank": "Rank",
                    "date": "Date",
                    "criteria": "Criteria"
                }
            },
            "map": {
                "baseLayers": "Base maps",
                "overlays": "Overlays",
                "layers": {
                    "esri": "Esri World Imagery",
                    "osm": "OpenStreetMap",
                    "shadow": "Shaded relief (IGN)",
                    "ortho": "Orthophotos (IGN)",
                    "planIgn": "Map IGN",
                    "adminIgn": "Admin (IGN)",
                    "bcae": "Waterways BCAE (IGN)",
                    "hydro": "Hydrography (IGN)"
                },
                "tooltip": {
                    "value": "Value"
                },
                "legend": {
                    "title": "Normalized values"
                },
                "layerSwitcherTip": "Layers",
                "loading": {
                    "noForecastAvailable": "No forecast available for the selected method and lead time",
                    "noForecastFoundSearch": "No forecast found within the searched time range"
                }
            }
        }
    },
    fr: {
        translation: {
            "panel": {
                "display": "Affichage",
                "forecasts": "Prévisions",
                "synthesis": "Synthèse",
                "stationSelection": "Sélection de la station",
                "analogDates": "Dates analogues",
                "loading": "Chargement…",
                "noData": "Aucune donnée",
                "errorLoading": "Erreur lors du chargement de {{what}}"
            },
            "workspace": {
                "noWorkspaces": "Aucun espace de travail disponible. Vérifiez votre configuration.",
                "label": "Espace de travail"
            },
            "stations": {
                "loading": "Chargement des stations…",
                "errorLoading": "Erreur lors du chargement des stations",
                "select": "Sélectionner une station"
            },
            "display": {
                "normalization": "Normalisation",
                "percentile": "Percentile"
            },
            "synthesis": {
                "normalizedValues": "Valeurs normalisées"
            },
            "toolbar": {
                "forecastOf": "Prévision du {{date}}",
                "loading": "Chargement...",
                "searching": "Recherche..."
            },
            "forecasts": {
                "loading": "Chargement..."
            },
            "analog": {
                "columns": {
                    "rank": "Rang",
                    "date": "Date",
                    "criteria": "Critère"
                }
            },
            "map": {
                "baseLayers": "Fonds de carte",
                "overlays": "Couches",
                "layers": {
                    "esri": "Esri World Imagery",
                    "osm": "OpenStreetMap",
                    "shadow": "Ombrage (IGN)",
                    "ortho": "Orthophotos (IGN)",
                    "planIgn": "Plan IGN",
                    "adminIgn": "Admin (IGN)",
                    "bcae": "Cours d'eau BCAE (IGN)",
                    "hydro": "Hydrographie (IGN)"
                },
                "tooltip": {
                    "value": "Valeur"
                },
                "legend": {
                    "title": "Valeurs normalisées"
                },
                "layerSwitcherTip": "Couches",
                "loading": {
                    "noForecastAvailable": "Aucune prévision disponible pour la méthode et l'échéance sélectionnées",
                    "noForecastFoundSearch": "Aucune prévision trouvée dans l'intervalle de recherche"
                }
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'fr', // default language set to French
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });
