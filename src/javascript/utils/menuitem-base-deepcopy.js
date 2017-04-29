Ext.define('Rally.ui.menu.bulk.DeepCopyBase', {
    alias: 'widget.rallyrecordmenuitembulkdeepcopybase',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    config: {
        onBeforeAction: function(){
//            console.log('onbeforeaction');
        },

        /**
         * @cfg {Function} onActionComplete a function called when the specified menu item action has completed
         * @param Rally.data.wsapi.Model[] onActionComplete.successfulRecords any successfully modified records
         * @param Rally.data.wsapi.Model[] onActionComplete.unsuccessfulRecords any records which failed to be updated
         */
        onActionComplete: function(){
            //         console.log('onActionComplete');
        }
    },
    _copyRecord: function(record, parent){
        var deferred = Ext.create('Deft.Deferred');
        var fid = record.get('FormattedID');
        var me = this;

        this.fireEvent('loadtree');
        Rally.ui.notify.Notifier.showStatus({message: 'Retreiving Data...'});

        var artifactTree = Ext.create('Rally.technicalservices.ArtifactTree',{
            portfolioItemTypes: this.portfolioItemTypes,
            listeners: {
                treeloaded: function(tree){
                   // me.fireEvent('loadtreecomplete');
                    tree.deepCopy(parent);
                },
                copycompleted: function(rootRecord){
                   // me.fireEvent('copycomplete');
                    deferred.resolve({record: record});
                },
                copyerror: function(errorMsg){
                  //  me.fireEvent('copyerror',{record: record, errorMessage: errorMsg});
                    deferred.resolve({record: record, errorMessage: errorMsg});
                },
                statusupdate: function(done, total){
                   // Rally.ui.notify.Notifier.showStatus({message:Ext.String.format("{0}: {1} of {2} Artifacts copied...", fid, done, total)});
                    var msg = Ext.String.format("{0}: {1} of {2} Artifacts copied...", fid, done, total);
                    this.publish('statusUpdate', msg);

                    // me.fireEvent('statusupdate',msg);
                },
                scope: this
            }
        });

        artifactTree.load(record, record.get('Parent'));

        return deferred;
    },
    copyRecords: function(records, parent){
        var promises= [],
            successfulRecords = [],
            unsuccessfulRecords = [];

        _.each(records, function(r){
            promises.push(function() {
                return this._copyRecord(r, parent);
            });
        }, this);

        Deft.Chain.sequence(promises, this).then({
            success: function(results){
                var errorMessage = '';
                _.each(results, function(r){
                    if (r.errorMessage){
                        errorMessage = r.errorMessage;
                        unsuccessfulRecords.push(r.record);
                    } else {
                        successfulRecords.push(r.record);
                    }
                });

                this.onSuccess(successfulRecords, unsuccessfulRecords, {parent: parent}, errorMessage);
            },
            failure: function(msg){

                this.onSuccess([], [], {parent: parent}, msg);
            },
            scope: this
        });

    },
    onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage) {

        var formattedID = args && args.parent && args.parent.get('FormattedID') || null,
            message = successfulRecords.length + (successfulRecords.length === 1 ? ' item has ' : ' items have ');

        if(successfulRecords.length === this.records.length) {
            message = message + ' been deep copied';
            if (formattedID) { message += ' to ' + formattedID }

            Rally.ui.notify.Notifier.show({
                message: message
            });
        } else {
            if (successfulRecords.length === 0){
                message = "0 items have been deep copied";
            }

            Rally.ui.notify.Notifier.showError({
                message: message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage,
                saveDelay: 500
            });
        }

        Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
    }
});