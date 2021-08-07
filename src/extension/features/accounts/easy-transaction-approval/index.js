import { Feature } from 'toolkit/extension/features/feature';
import { isCurrentRouteAccountsPage } from 'toolkit/extension/utils/ynab';
import { controllerLookup, serviceLookup } from 'toolkit/extension/utils/ember';
import { l10n } from 'toolkit/extension/utils/toolkit';

export class EasyTransactionApproval extends Feature {
  initBudgetVersion = true;

  initKeyLoop = true;

  initClickLoop = true;

  watchForKeys = false;

  selectedTransactions = undefined;

  shouldInvoke() {
    return isCurrentRouteAccountsPage();
  }

  observe(changedNodes) {
    if (!this.shouldInvoke()) return;

    // watch for the user potentially changing the budget
    if (this.initBudgetVersion) {
      this.addBudgetVersionIdObserver();
    }

    // watch for switch to Accounts section or selection change
    if (
      changedNodes.has('ynab-grid-body') ||
      changedNodes.has('ynab-checkbox-button is-checked') ||
      changedNodes.has('ynab-checkbox-button ')
    ) {
      this.invoke();
    }

    // disable keydown watch on creation or editing of transactions
    if (changedNodes.has('accounts-toolbar-edit-transaction button button-disabled')) {
      this.watchForKeys = false;
    }
  }

  addBudgetVersionIdObserver() {
    var _this = this;

    var applicationController = controllerLookup('application');
    applicationController.addObserver('budgetVersionId', function () {
      Ember.run.scheduleOnce('afterRender', this, function () {
        _this.initKeyLoop = true;
        _this.initClickLoop = true;
      });
    });
  }

  invoke() {
    // get selected transactions
    this.selectedTransactions = null;
    const accountController = controllerLookup('accounts');
    if (!accountController) {
      return;
    }

    const visibleTransactionDisplayItems = accountController.get('visibleTransactionDisplayItems');
    if (visibleTransactionDisplayItems) {
      this.selectedTransactions = visibleTransactionDisplayItems.filter(
        (i) => i.isChecked && i.get('accepted') === false
      );
    }

    // only watch for keydown if there are selected, unaccepted transactions
    if (this.selectedTransactions && this.selectedTransactions.length > 0) {
      this.watchForKeys = true;
    }

    // call watchForKeyInput() once
    if (this.initKeyLoop) {
      this.watchForKeyInput();
    }

    // call watchForRightClick() once
    if (this.initClickLoop) {
      this.watchForRightClick();
    }
  }

  watchForKeyInput() {
    var _this = this;

    $('body').on('keydown', function (e) {
      if ((e.which === 13 || e.which === 65) && _this.watchForKeys) {
        // approve selected transactions when 'a' or 'enter is pressed'
        _this.approveSelectedTransactions();

        // disable keydown watch until selection is changed again
        _this.watchForKeys = false;
      }
    });

    // ensure that watchForKeyInput() is only called once
    this.initKeyLoop = false;
  }

  clickCallback(event) {
    // prevent defaults
    event.preventDefault();
    event.stopPropagation();

    const clickedRow = $(this).closest('.ynab-grid-body-row');
    const clickedRowEntityId = clickedRow.attr('data-row-id');

    const accountsService = serviceLookup('accounts');
    const isChecked =
      accountsService.areChecked.filter(
        (transaction) => transaction.entityId === clickedRowEntityId
      ).length > 0;

    // if the row clicked isn't already selected, approve only that transaction
    if (!isChecked) {
      accountsService.selectedAccount.getTransactions().forEach((transaction) => {
        if (transaction.entityId === clickedRowEntityId && !transaction.accepted) {
          transaction.setAccepted(true);
        }
      });
    } else {
      event.data.approveSelectedTransactions();
    }
  }

  watchForRightClick() {
    var _this = this;

    // call approveTransactions if the notification 'i' icon is right clicked on
    Ember.run.next(function () {
      $('.ynab-grid').off(
        'contextmenu',
        '.ynab-grid-body-row .ynab-grid-cell-notification button.transaction-notification-info',
        _this.clickCallback
      );
      $('.ynab-grid').on(
        'contextmenu',
        '.ynab-grid-body-row .ynab-grid-cell-notification button.transaction-notification-info',
        _this,
        _this.clickCallback
      );
    });

    // ensure that watchForRightClick() is only called once
    this.initClickLoop = false;
  }

  approveSelectedTransactions() {
    const accountsService = serviceLookup('accounts');

    const editingService = serviceLookup('transaction-editor');
    const editingId = editingService.editingId;

    accountsService.areChecked.forEach((transaction) => {
      if (editingId && editingId === transaction.entityId) {
        transaction.setAccepted(true);
      } else {
        transaction.approve();
      }
    });
  }
}
