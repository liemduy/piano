// MIDI feature logic.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const resolveMidiBadgeKey = (status, labelKey = null) => {
  if (labelKey) return labelKey;
  if (status === 'on') return 'midi.badge.on';
  if (status === 'warn') return 'midi.badge.select';
  return 'midi.badge.off';
};

const setMidiBadge = (status, labelKey = null) => {
  const badge = PianoApp.$('midiBadge');
  if (!badge) return;

  const resolvedKey = resolveMidiBadgeKey(status, labelKey);
  PianoApp.state.midi.badgeStatus = status;
  PianoApp.state.midi.badgeLabelKey = resolvedKey;

  badge.classList.remove('off', 'on', 'warn');
  badge.classList.add(status);
  PianoApp.$('midiText').textContent = PianoApp.t(resolvedKey);
  badge.title = PianoApp.t('midi.badge.connect_title');
};

const refreshMidiList = async () => {
  const select = PianoApp.$('midiSelect');
  if (!select) return;

  select.innerHTML = '';
  if (!navigator.requestMIDIAccess) {
    setMidiBadge('warn', 'midi.badge.no_webmidi');
    PianoApp.showToast(PianoApp.t('toast.browser_no_webmidi'));
    return;
  }

  try {
    PianoApp.state.midi.access = PianoApp.state.midi.access || await navigator.requestMIDIAccess();
  } catch (error) {
    console.error(error);
    setMidiBadge('warn', 'midi.badge.blocked');
    PianoApp.showToast(PianoApp.t('toast.midi_blocked'));
    return;
  }

  const inputs = Array.from(PianoApp.state.midi.access.inputs.values());
  if (!inputs.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = PianoApp.t('midi.modal.no_input_option');
    select.appendChild(option);
    setMidiBadge('off', 'midi.badge.off');
    return;
  }

  inputs.forEach((input) => {
    const option = document.createElement('option');
    option.value = input.id;
    option.textContent = input.name || input.manufacturer || input.id;
    select.appendChild(option);
  });

  setMidiBadge(PianoApp.state.midi.connected ? 'on' : 'warn', PianoApp.state.midi.connected ? 'midi.badge.on' : 'midi.badge.select');
};

const onMidiMessage = (message) => {
  const [status, data1, data2] = message.data;
  const command = status & 0xF0;
  if (command === 0x90 && data2 > 0) {
    PianoApp.state.activeKeys.add(data1);
    PianoApp.handleNoteOn(data1, data2);
    return;
  }

  if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    PianoApp.state.activeKeys.delete(data1);
  }
};

const connectSelectedMidi = async () => {
  await refreshMidiList();
  const select = PianoApp.$('midiSelect');
  const id = select.value;
  if (!id) {
    PianoApp.showToast(PianoApp.t('toast.no_midi_input'));
    return;
  }

  const inputs = Array.from(PianoApp.state.midi.access.inputs.values());
  const chosen = inputs.find((input) => input.id === id) || inputs[0];
  if (!chosen) {
    PianoApp.showToast(PianoApp.t('toast.midi_not_found'));
    return;
  }

  if (PianoApp.state.midi.input) PianoApp.state.midi.input.onmidimessage = null;
  PianoApp.state.midi.input = chosen;
  PianoApp.state.midi.input.onmidimessage = onMidiMessage;
  PianoApp.state.midi.connected = true;

  setMidiBadge('on', 'midi.badge.on');
  PianoApp.showToast(PianoApp.t('toast.midi_connected'));
  PianoApp.closeModal?.('midiModal');
};

PianoApp.setMidiBadge = setMidiBadge;
PianoApp.refreshMidiList = refreshMidiList;
PianoApp.connectSelectedMidi = connectSelectedMidi;
