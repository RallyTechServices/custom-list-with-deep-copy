Ext.define("custom-list-with-deep-copy", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "custom-list-with-deep-copy"
    },

    config: {
        defaultSettings: {
            rootModelTypePath: 'HierarchicalRequirement'
        }
    },

    launch: function() {

        Rally.technicalservices.Toolbox.fetchPortfolioItemTypes().then({
            success: this.initializeApp,
            failure: this.showErrorNotification,
            scope: this
        });
    },
    initializeApp: function(portfolioItemTypes){
        this.portfolioItemTypePaths = portfolioItemTypes;
        this.buildTreeStore();
    },
    buildTreeStore: function(){
        this.down('#display_box').removeAll();

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.getRootModelTypePath()],
            enableHierarchy: true
        }).then({
            success: this.buildGridboard,
            scope: this
        });
    },
    buildGridboard: function(store){
        if (this.down('rallygridboard')){
            this.down('rallygridboard').destroy();
        }

        var typesToCopy = this.getTypesToCopy();

        this.add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this.getRootModelTypePath(),
            toggleState: 'grid',
            gridConfig: {
                store: store,
                storeConfig: {
                    pageSize: 200
                },
                columnCfgs: [
                    'Name',
                    'Project'
                ],
                bulkEditConfig: {
                    items: [{
                        xtype: 'rallyrecordmenuitembulkdeepcopyto' ,
                        portfolioItemTypes: this.getPortfolioItemTypePaths(),
                        typesToCopy: typesToCopy
                    },{
                        xtype: 'rallyrecordmenuitembulkdeepcopy',
                        portfolioItemTypes: this.getPortfolioItemTypePaths(),
                        typesToCopy: typesToCopy
                    }]
                }
            },
            plugins: this.getPlugins(),
            height: this.getHeight()
        });

    },
    getPlugins: function(){
        return [{
            ptype: 'rallygridboardfieldpicker',
            headerPosition: 'left',
            modelNames: this.getTypesToCopy(),
            stateful: true,
            stateId: this.getContext().getScopedStateId('deep-copy-columns')
        },{
            ptype: 'rallygridboardinlinefiltercontrol',
            inlineFilterButtonConfig: {
                stateful: true,
                stateId: this.getContext().getScopedStateId('deep-copy-filter'),
                modelNames: [this.getRootModelTypePath()],
                inlineFilterPanelConfig:
                {
                    collapsed: false,
                    quickFilterPanelConfig: {
                        defaultFields: ['Owner']
                    }
                }
            }
        }];
    },
    getTypesToCopy: function(){

        var typesToCopy = ['hierarchicalrequirement','task'],
            rootModelTypePath = this.getRootModelTypePath();

        if(/PortfolioItem\//.test(rootModelTypePath)){
            Ext.Array.each(this.getPortfolioItemTypePaths(), function(p){
                typesToCopy.unshift(p);
                return p !== rootModelTypePath;
            });
        }
        return typesToCopy;
    },
    getPortfolioItemTypePaths: function(){
        return this.portfolioItemTypePaths;
    },
    getRootModelTypePath: function(){
        return this.getSetting('rootModelTypePath');
    },
    getCopyToParentTypePath: function(){
        var piIdx = 0;

        if (/PortfolioItem\//.test(this.getRootModelTypePath())){
            piIdx = _.indexOf(this.getPortfolioItemTypePaths(), this.getRootModelTypePath()) + 1;
        }

        if (this.getPortfolioItemTypePaths().length > piIdx){
            return this.getPortfolioItemTypePaths()[piIdx];
        }
        return null;
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getSettingsFields: function(){

        var filters = [{
            property: 'TypePath',
            operator: 'contains',
            value: 'PortfolioItem/'
        },{
            property: 'TypePath',
            value: 'HierarchicalRequirement'
        }];
        filters = Rally.data.wsapi.Filter.or(filters);
        return [{
            xtype: 'rallycombobox',
            name: 'rootModelTypePath',
            storeConfig: {
                model: 'TypeDefinition',
                fetch: ['TypePath','DisplayName'],
                filters: filters,
                remoteFilter: true
            },
            displayField: 'DisplayName',
            valueField: 'TypePath',
            fieldLabel: 'Artifact Type',
            labelAlign: 'right'
        }];
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
    
});
