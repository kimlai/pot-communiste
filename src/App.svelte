<script>
  import { onMount } from 'svelte';

  export let participants = {};
  let id = new URLSearchParams(window.location.search).get("id");
  let counts = [];
  let transfers = [];

  onMount(async () => {
    counts = await idbKeyval.get("counts");
    participants = counts.filter(count => count.id === id)[0].participants || {};
  });

  $: totalSpent = Object.values(participants)
    .reduce((total, participant) => total + participant.spent, 0);

  $: averageSpent = Object.keys(participants).length > 0 ? Math.round(totalSpent / Object.keys(participants).length) : 0;

  $: totalParticipations = Object.values(participants)
    .reduce((total, participant) => total + participant.participation, 0);

  $: inDebt = Object.values(participants).filter(participant => participant.participation > participant.spent);

  $: creditors = Object.values(participants).filter(participant => participant.participation < participant.spent);

  function saveState() {
    for (const count of counts) {
      if (count.id === id) {
        count.participants = participants;
        count.transfers = transfers;
      }
    }
    idbKeyval.set("counts", counts);
  }

  function addParticipant(e) {
    e.preventDefault();
    const form = e.target;
    const name = new FormData(form).get("name");
    form.reset();
    participants = Object.assign(
      participants,
      { [name]: { name, spent: 0, participation: 0, priorities: {} } }
    );

    saveState();
  }

  function setSpent(name) {
    return function(e) {
      const spent = parseInt(e.target.value || 0, 10);
      const participant = Object.assign(participants[name], { spent });
      participants = Object.assign(participants, { [name]: participant });
      saveState();
    }
  }

  function setParticipation(name) {
    return function(e) {
      const participation = parseInt(e.target.value || 0, 10);
      const participant = Object.assign(participants[name], { participation });
      participants = Object.assign(participants, { [name]: participant });
      saveState();
    }
  }

  function setPriority(debitor, priority) {
    return function(e) {
      // TODO : handle when we delete a priority
      const participant = participants[debitor];
      participant.priorities[e.target.value] = priority;
      participants = Object.assign(participants, { [debitor]: participant });
      saveState();
    }
  }

  function solve(transfers) {
    function transfersFromAmount(name) {
      return transfers
        .filter(transfer => transfer.from === name)
        .reduce((total, transfer) => transfer.amount + total, 0);
    }
    function transfersToAmount(name) {
      return transfers
        .filter(transfer => transfer.to === name)
        .reduce((total, transfer) => transfer.amount + total, 0);
    }
    const debitors = Object.values(participants).filter(
      participant =>
        participant.spent + transfersFromAmount(participant.name) < (participant.participation)
    );
    const creditors = Object.values(participants).filter(
      participant =>
        participant.spent > (participant.participation + transfersToAmount(participant.name))
    );

    if (debitors.length === 0 || creditors.length === 0) {
      return transfers;
    }
    // handle debitors with priorities first
    debitors.sort((a, b) => {
      const prioritiesA = Object.keys(a.priorities).length;
      const prioritiesB = Object.keys(b.priorities).length;
      if (prioritiesA > prioritiesB) {
        return -1;
      }
      if (prioritiesA < prioritiesB) {
        return 1;
      }
      return 0;
    });
    const debitor = debitors[0];
    creditors.sort((a, b) => {
      const priorityA = debitor.priorities[a.name];
      const priorityB = debitor.priorities[b.name];
      if (priorityA < priorityB || priorityB === undefined) {
        return -1;
      }
      if (priorityA > priorityB || priorityA === undefined) {
        return 1;
      }
      return 0;
    });
    const creditor = creditors[0];
    const transfer = {
      from: debitor.name,
      to: creditor.name,
      amount: Math.min(
        debitor.participation - debitor.spent - transfersFromAmount(debitor.name),
        creditor.spent - creditor.participation - transfersToAmount(creditor.name)
      )
    }
    return solve([...transfers, transfer]);
  }

  function handleSolve() {
    transfers = solve([]);
  }

  function diff(amount) {
    return `${amount > 0 ? "+" : ""}${amount}`;
  }
</script>

<main>
  <h2>1. Les participants</h2>
  <p>Indiquez toutes les personnes qui participent à ce pot.</p>
  <form on:submit={addParticipant}>
    <label for="name">Nom</label>
    <input id="name" name="name" required />
    <button>Ajouter un·e participant·e</button>
  </form>
  <h2>2. Les dépenses</h2>
  <p>Indiquez combien chaque personne a dépensé.</p>
  <div>
    <div class="grid">
      {#each Object.values(participants) as participant}
        <div>{participant.name}</div>
        <div class="input--with-unit">
          <input inputmode="numeric" on:input={setSpent(participant.name)} value="{participant.spent}" />
          <div>€</div>
        </div>
      {/each}
      <div><b>total</b></div>
      <b>
        <div class="input--with-unit">
          <input disabled value="{totalSpent}" />
          <div>€</div>
        </div>
      </b>
    </div>
    <div>{averageSpent}€ par personne</div>
  </div>
  <h2>3. Les participations</h2>
  <p>Indiquez combien chaque personne peut donner.</p>
  <div>
    <div class="grid">
      {#each Object.values(participants) as participant}
        <div>{participant.name}</div>
        <div class="input--with-unit">
          <input inputmode="numeric" on:input={setParticipation(participant.name)} value="{participant.participation}" />
          <div>€</div>
        </div>
      {/each}
      <div><b>équilibre</b></div>
      <b>
        <div class="input--with-unit">
          <input disabled value="{diff(totalParticipations - totalSpent)}" />
          <div>€</div>
        </div>
      </b>
    </div>
    <div>{totalParticipations}€ de participation</div>
  </div>
  <h2>4. Préférences</h2>
  <p>Vous pouvez indiquer pour chaque personne qui elle préfère devoir rembourser (optionnel).</p>
  {#each inDebt as debitor}
    <div>
      <div><b>{debitor.name}</b></div>
      {#each creditors as creditor, i}
        <div>{i + 1}&nbsp;
          <select on:change={setPriority(debitor.name, i)}>
            <option value="" />
            {#each creditors as creditorOption}
              <option value="{creditorOption.name}">{creditorOption.name}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  {/each}
  <h2>5. Équilibre</h2>
  <button on:click={handleSolve}>Lancer les calculs</button>
  <output>
    <ul>
      {#each transfers as transfer}
        <li>{transfer.from} doit {transfer.amount}€ à {transfer.to}</li>
      {/each}
    </ul>
  </output>
</main>

<style>
  .grid {
    list-style: none;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: baseline;
    grid-gap: 0 1rem;
  }

  .input--with-unit input {
    width: 6ch;
    text-align: right;
  }
  .input--with-unit {
    display: flex;
    align-items: baseline;
  }
  .input--with-unit > *:last-child {
    margin-left: 0.5rem;
  }
  input:disabled {
    background: #fff;
    color: black;
    border: none;
  }
</style>
