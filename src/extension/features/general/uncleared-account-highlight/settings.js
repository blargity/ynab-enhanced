module.exports = {
  name: 'UnclearedAccountHighlight',
  type: 'select',
  default: false,
  section: 'general',
  title: 'Emphasize Uncleared Accounts',
  description:
    'Add a small indicator next to account balances on the sidebar to indicate not all transactions are cleared.',
  options: [
    { name: 'Uncleared Accounts', value: '1' },
    { name: 'Uncleared and Unreconciled Accounts', value: '2' },
  ],
};
