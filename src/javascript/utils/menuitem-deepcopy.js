Ext.define('Rally.ui.menu.bulk.DeepCopy', {
    alias: 'widget.rallyrecordmenuitembulkdeepcopy',
    extend: 'Rally.ui.menu.bulk.DeepCopyBase',

    config: {
        text: 'Deep Copy',

        handler: function () {
            this.copyRecords(this.records, null);
        },
        predicate: function (records) {
            return _.every(records, function (record) {
                var thisRecordType = record.get('_type').toLowerCase();
                return (thisRecordType === 'hierarchicalrequirement') || (/portfolioitem/.test(thisRecordType));
            });
        }
    }
});