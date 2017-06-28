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
            rootModelTypePath: 'HierarchicalRequirement',
            query: null
        }
    },

    launch: function() {

        Rally.technicalservices.Toolbox.fetchPortfolioItemTypes().then({
            success: this.initializeApp,
            failure: this.showErrorNotification,
            scope: this
        });
        this.subscribe(this, 'statusUpdate', this.statusUpdate, this);
        this.subscribe(this, 'maskUpdate', this.maskUpdate, this);
        this.subscribe(this, 'copyComplete', this.copyComplete, this);
        this.subscribe(this, 'copyError', this.copyError, this);
    },
    maskUpdate: function(arg){

        if (!arg || arg === ''){
            arg = false;
        }
        this.setLoading(arg);
        this.refresh();
    },
    initializeApp: function(portfolioItemTypes){
        this.portfolioItemTypePaths = portfolioItemTypes;
        this.buildTreeStore();
    },
    getQueryFilter: function(){
       if (this.getSetting('query')){
         return Rally.data.wsapi.Filter.fromQueryString(this.getSetting('query'));
       }
       return [];
    },
    buildTreeStore: function(){
        this.down('#display_box').removeAll();

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.getRootModelTypePath()],
            enableHierarchy: true,
            filters: this.getQueryFilter()
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
                    pageSize: 200,
                    filters: this.getQueryFilter()
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
                        defaultFields: ['ArtifactSearch','Owner']
                    }
                }
            }
        }];
    },
    statusUpdate: function(msg){
        Rally.ui.notify.Notifier.hide();
        Rally.ui.notify.Notifier.show({message: msg, showForever: true});
    },
    copyComplete: function(msg){
        this.setLoading(false);
        Rally.ui.notify.Notifier.hide();
        Rally.ui.notify.Notifier.show({message: msg, duration: 5000});
    },
    copyError: function(msg){
        this.setLoading(false);
        Rally.ui.notify.Notifier.hide();
        Rally.ui.notify.Notifier.showError({message: msg, duration: 10000, saveDelay: 500});
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
        },{
          type: 'query'
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
