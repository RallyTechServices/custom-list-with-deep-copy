Ext.define('Rally.ui.menu.bulk.DeepCopyTo', {
    alias: 'widget.rallyrecordmenuitembulkdeepcopyto',
    extend: 'Rally.ui.menu.bulk.DeepCopyBase',

    config: {

        text: 'Deep Copy to...',

        handler: function () {
            this._onBulkCopyToParentClicked();
        },
        predicate: function (records) {
            //var portfolioItemType = this.typesToCopy[0].toLowerCase();
            var highestPortfolioItemType = this.portfolioItemTypes.slice(-1)[0].toLowerCase();

            var recordType = records && records[0].get('_type');
            return _.every(records, function (record) {
                var thisRecordType = record.get('_type').toLowerCase();
                return thisRecordType == recordType && thisRecordType !== highestPortfolioItemType;
            });
        }
    },
    _onBulkCopyToParentClicked: function() {
        var records = this.records,
            me = this;

        var type = records && records[0].get('_type').toLowerCase();
        var parentType = null;

        if (type === 'hierarchicalrequirement'){
            parentType = this.portfolioItemTypes[0];
        } else {
            for (var i=0; i<this.portfolioItemTypes.length; i++){
                if (type === this.portfolioItemTypes[i].toLowerCase() && i < this.portfolioItemTypes.length - 1){
                    parentType = this.portfolioItemTypes[i+1];
                    i = this.portfolioItemTypes.length;
                }
            }
        }

        if (parentType){
            Ext.create("Rally.ui.dialog.ArtifactChooserDialog", {
                artifactTypes: [parentType.toLowerCase()],
                autoShow: true,
                height: 250,
                title: 'Choose Parent to copy to',
                storeConfig: {
                    context: {
                        project: null,
                        workspace: Rally.util.Ref.getRelativeUri(this.getContext().getWorkspace())
                    },
                    fetch: ['FormattedID','Name','Project'],
                    filters: [{
                        property: 'Project.State',
                        value: 'Open'
                    }]
                },
                columns: [
                    {
                        text: 'ID',
                        dataIndex: 'FormattedID',
                        renderer: _.identity
                    },
                    'Name',
                    'Project'
                ],
                listeners: {
                    artifactchosen: function(dialog, selectedRecord){
                        me.copyRecords(records, selectedRecord);
                    },
                    scope: me
                }
            });
        } else {
            //We should never get here...
            Rally.ui.notify.Notifier.showError({
                message: 'No Parent Type found for ' + type + ';  Use the "Deep Copy..." menu item instead.'
            });
        }

    }
});