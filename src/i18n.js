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
                "searching": "Searching...",
                "restoreLastForecast": "Restore last forecast"
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
            },
            "seriesModal": {
                "selectStation": "Select a station to view the forecast series.",
                "seriesAriaLabel": "Forecast percentiles time series",
                "loadingPreviousForecasts": "Loading previous forecasts…",
                "errorLoadingPreviousForecasts": "Error loading previous forecasts",
                "loadingSeries": "Loading series…",
                "resolvingConfig": "Resolving configuration…",
                "errorLoadingSeries": "Error loading series.",
                "noDataForStation": "No data available for this station.",
                "mainQuantiles": "Main quantiles",
                "allQuantiles": "All quantiles",
                "bestAnalogs": "Best analogs",
                "tenYearReturn": "10 year return period",
                "allReturnPeriods": "All return periods",
                "previousForecasts": "Previous forecasts",
                "precipitation": "Precipitation [mm]",
                "quantile90": "Quantile 90",
                "quantile60": "Quantile 60",
                "quantile20": "Quantile 20",
                "median": "Median",
                "analog": "Analog",
                "analogWithIndex": "Analog {{index}}",
                "p10": "P10",
                "unexpectedHistoryResponse": "Unexpected history response",
                "close": "Close",
                "loadingBestAnalogs": "Loading best analogs…",
                "noBestAnalogs": "No best analogs",
                "loadingReference": "Loading reference values…",
                "noReferenceValues": "No reference values",
                "noPreviousForecastsAvailable": "No previous forecasts available"
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
                "searching": "Recherche...",
                "restoreLastForecast": "Restaurer la dernière prévision"
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
            },
            "seriesModal": {
                "selectStation": "Sélectionnez une station pour afficher les séries de prévision.",
                "seriesAriaLabel": "Séries de pourcentiles de prévision",
                "loadingPreviousForecasts": "Chargement des prévisions précédentes…",
                "errorLoadingPreviousForecasts": "Erreur lors du chargement des prévisions précédentes",
                "loadingSeries": "Chargement des séries…",
                "resolvingConfig": "Résolution de la configuration…",
                "errorLoadingSeries": "Erreur lors du chargement des séries.",
                "noDataForStation": "Aucune donnée disponible pour cette station.",
                "mainQuantiles": "Quantiles principaux",
                "allQuantiles": "Tous les quantiles",
                "bestAnalogs": "Meilleurs analogues",
                "tenYearReturn": "Période de retour 10 ans",
                "allReturnPeriods": "Toutes les périodes de retour",
                "previousForecasts": "Prévisions précédentes",
                "precipitation": "Précipitation [mm]",
                "quantile90": "Quantile 90",
                "quantile60": "Quantile 60",
                "quantile20": "Quantile 20",
                "median": "Médiane",
                "analog": "Analogique",
                "analogWithIndex": "Analogue {{index}}",
                "p10": "P10",
                "unexpectedHistoryResponse": "Réponse d'historique inattendue",
                "close": "Fermer",
                "loadingBestAnalogs": "Chargement des meilleurs analogues…",
                "noBestAnalogs": "Aucun meilleur analogue",
                "loadingReference": "Chargement des valeurs de référence…",
                "noReferenceValues": "Aucune valeur de référence",
                "noPreviousForecastsAvailable": "Aucune prévision précédente disponible"
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
