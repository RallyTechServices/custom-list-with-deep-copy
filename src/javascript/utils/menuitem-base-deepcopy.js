Ext.define('Rally.ui.menu.bulk.DeepCopyBase', {
    alias: 'widget.rallyrecordmenuitembulkdeepcopybase',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    mixins: {
        messageable: 'Rally.Messageable'
    },

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
        me.publish('maskUpdate', 'Retrieving Data...');


        var artifactTree = Ext.create('Rally.technicalservices.ArtifactTree',{
            portfolioItemTypes: this.portfolioItemTypes,
            listeners: {
                treeloaded: function(tree){
                    me.publish('maskUpdate', 'Copying Data...');
                    tree.deepCopy(parent);
                },
                copycompleted: function(rootRecord){
                   // me.fireEvent('copycomplete');
                    me.publish('maskUpdate');

                    deferred.resolve({record: record});
                },
                copyerror: function(errorMsg){
                  //  me.fireEvent('copyerror',{record: record, errorMessage: errorMsg});
                    me.publish('maskUpdate');
                    deferred.resolve({record: record, errorMessage: errorMsg});
                },
                statusupdate: function(done, total){
                    var divisor = 10,
                        showMsg = false;
                    if (total < 50){
                        divisor = 5;
                    }
                    if (total < 10){
                        divisor = 2;
                    }
                    if (total < 4){
                        divisor = 1;
                    }
                    var showMsg = done % divisor === 0 && done > 0 && done !== total;
                    if (showMsg){
                        // Rally.ui.notify.Notifier.showStatus({message:Ext.String.format("{0}: {1} of {2} Artifacts copied...", fid, done, total)});
                        var msg = Ext.String.format("{0}: {1} of {2} Artifacts copied...", fid, done, total);
                        me.publish('statusUpdate', msg);
                    }
                    if (done === total){
                        me.publish('statusUpdate', 'Stitching artifacts...');
                    }
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

            this.publish('copyComplete', message);
            //Rally.ui.notify.Notifier.show({
            //    message: message
            //});
        } else {
            if (successfulRecords.length === 0){
                message = "0 items have been deep copied";
            }

            this.publish('copyError', message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage);
            //Rally.ui.notify.Notifier.showError({
            //    message: message + ', but ' + unsuccessfulRecords.length + ' failed: ' + errorMessage,
            //    saveDelay: 500
            //});
        }

        Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
    }
});