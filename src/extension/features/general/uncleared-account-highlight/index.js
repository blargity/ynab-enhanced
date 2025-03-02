import { Feature } from 'toolkit/extension/features/feature';

import { getAccountsService } from 'toolkit/extension/utils/ynab';
import debounce from 'debounce';

const INDICATOR_CLASS = 'tk-uncleared-account-indicator';
const INDICATOR_ELEMENT = `<svg class="ynab-new-icon ${INDICATOR_CLASS} " width="16" height="16"><use href="#icon_sprite_cleared_circle"></use></svg>`;

function isUnclearedTransaction(transaction) {
  return transaction && transaction.cleared === ynab.constants.TransactionState.Uncleared;
}

export class UnclearedAccountHighlight extends Feature {
  injectCSS() {
    return require('./index.css');
  }

  shouldInvoke() {
    return true;
  }

  updateSidebarIndicator() {
    // the nav-account-icons-right container is hard-coded as 1rem, when we add the
    // cleared icon to it, that's not enough space if there's already an icon in the space
    // so we need to add a class which overrides it to 2rem.
    $('.nav-account-row').each((_, navAccount) => {
      const account = getAccountsService().getAccountById(navAccount.dataset.accountId);

      const unclearedTransactions = account
        .getTransactions()
        .filter((transaction) => isUnclearedTransaction(transaction));

      if (unclearedTransactions.length === 0) {
        if (navAccount.querySelector(`.${INDICATOR_CLASS}`) !== null) {
          navAccount.querySelector(`.${INDICATOR_CLASS}`).remove();
        }
        return;
      }

      console.log(unclearedTransactions);

      const isIndicatorShowing = navAccount.querySelector(`.${INDICATOR_CLASS}`) !== null;
      const navAccountIconsRight = navAccount.querySelector('.nav-account-icons-right');

      if (!isIndicatorShowing) {
        $(navAccountIconsRight).append(INDICATOR_ELEMENT);
      }
    });
  }

  debouncedInvoke = debounce(this.invoke, 100);

  invoke() {
    this.updateSidebarIndicator();
  }

  observe(changedNodes) {
    if (!this.shouldInvoke()) return;

    if (changedNodes.has('nav-account-value')) {
      this.debouncedInvoke();
    }
  }

  destroy() {
    $(`.nav-account-row .${INDICATOR_CLASS}`).remove();
    $('.tk-nav-account-icons-right-space').removeClass('tk-nav-account-icons-right-space');
  }
}
