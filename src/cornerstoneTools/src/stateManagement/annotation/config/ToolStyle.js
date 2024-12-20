class ToolStyle {
    constructor() {
        const defaultConfig = {
            color: 'rgb(255, 255, 0)',
            colorHighlighted: 'rgb(0, 255, 0)',
            colorSelected: 'rgb(0, 220, 0)',
            colorLocked: 'rgb(209, 193, 90)',
            lineWidth: '1',
            lineDash: '',
            shadow: true,
            textBoxVisibility: true,
            textBoxFontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            textBoxFontSize: '14px',
            textBoxColor: 'rgb(255, 255, 0)',
            textBoxColorHighlighted: 'rgb(0, 255, 0)',
            textBoxColorSelected: 'rgb(0, 255, 0)',
            textBoxColorLocked: 'rgb(209, 193, 90)',
            textBoxBackground: '',
            textBoxLinkLineWidth: '1',
            textBoxLinkLineDash: '2,3',
            textBoxShadow: true,
        };
        this._initializeConfig(defaultConfig);
    }
    getAnnotationToolStyles(annotationUID) {
        return this.config.annotations && this.config.annotations[annotationUID];
    }
    getViewportToolStyles(viewportId) {
        return this.config.viewports && this.config.viewports[viewportId];
    }
    getToolGroupToolStyles(toolGroupId) {
        return this.config.toolGroups && this.config.toolGroups[toolGroupId];
    }
    getDefaultToolStyles() {
        return this.config.default;
    }
    setAnnotationStyles(annotationUID, styles) {
        let annotationSpecificStyles = this.config.annotations;
        if (!annotationSpecificStyles) {
            this.config = {
                ...this.config,
                annotations: {},
            };
            annotationSpecificStyles = this.config.annotations;
        }
        annotationSpecificStyles[annotationUID] = styles;
    }
    setViewportToolStyles(viewportId, styles) {
        let viewportSpecificStyles = this.config.viewports;
        if (!viewportSpecificStyles) {
            this.config = {
                ...this.config,
                viewports: {},
            };
            viewportSpecificStyles = this.config.viewports;
        }
        viewportSpecificStyles[viewportId] = styles;
    }
    setToolGroupToolStyles(toolGroupId, styles) {
        let toolGroupSpecificStyles = this.config.toolGroups;
        if (!toolGroupSpecificStyles) {
            this.config = {
                ...this.config,
                toolGroups: {},
            };
            toolGroupSpecificStyles = this.config.toolGroups;
        }
        toolGroupSpecificStyles[toolGroupId] = styles;
    }
    setDefaultToolStyles(styles) {
        this.config.default = styles;
    }
    getStyleProperty(toolStyle, specifications) {
        const { annotationUID, viewportId, toolGroupId, toolName } = specifications;
        return this._getToolStyle(toolStyle, annotationUID, viewportId, toolGroupId, toolName);
    }
    _getToolStyle(property, annotationUID, viewportId, toolGroupId, toolName) {
        if (annotationUID) {
            const annotationToolStyles = this.getAnnotationToolStyles(annotationUID);
            if (annotationToolStyles) {
                if (annotationToolStyles[property] !== undefined) {
                    return annotationToolStyles[property];
                }
            }
        }
        if (viewportId) {
            const viewportToolStyles = this.getViewportToolStyles(viewportId);
            if (viewportToolStyles) {
                if (viewportToolStyles[toolName] &&
                    viewportToolStyles[toolName][property] !== undefined) {
                    return viewportToolStyles[toolName][property];
                }
                if (viewportToolStyles.global &&
                    viewportToolStyles.global[property] !== undefined) {
                    return viewportToolStyles.global[property];
                }
            }
        }
        if (toolGroupId) {
            const toolGroupToolStyles = this.getToolGroupToolStyles(toolGroupId);
            if (toolGroupToolStyles) {
                if (toolGroupToolStyles[toolName] &&
                    toolGroupToolStyles[toolName][property] !== undefined) {
                    return toolGroupToolStyles[toolName][property];
                }
                if (toolGroupToolStyles.global &&
                    toolGroupToolStyles.global[property] !== undefined) {
                    return toolGroupToolStyles.global[property];
                }
            }
        }
        const globalStyles = this.getDefaultToolStyles();
        if (globalStyles[toolName] &&
            globalStyles[toolName][property] !== undefined) {
            return globalStyles[toolName][property];
        }
        if (globalStyles.global && globalStyles.global[property] !== undefined) {
            return globalStyles.global[property];
        }
    }
    _initializeConfig(config) {
        const toolStyles = {};
        for (const name in config) {
            toolStyles[name] = config[name];
        }
        this.config = {
            default: {
                global: toolStyles,
            },
        };
    }
}
const toolStyle = new ToolStyle();
export default toolStyle;
