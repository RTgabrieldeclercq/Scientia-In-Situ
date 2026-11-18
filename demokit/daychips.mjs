// Day chips (daychips) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs daychips
export default {
  by: '',
  use: 'See at a glance which day a component belongs to, and which day note it was filed from.',
  view: [1040, 650],
  // the test note: a run note with components from today and yesterday, one of them filed from yesterday's day note; today's day note with two entries
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const gels = KIT.fill(KIT.first(A), 'Gels', 'Gel batch 14, 30 kPa, coated with fibronectin at 5 µg/mL.'); KIT.ago(gels, 1, '16:40');
    const img = KIT.box(A, 'Imaging', 'Leading edge, 20× at every 5 min; beads imaged before and after trypsin.', { x: gels.x + 460, y: gels.y }); KIT.ago(img, 0, '07:30');
    const egf = KIT.box(A, 'EGF', 'EGF at 10 ng/mL added after the third frame.', { x: gels.x, y: gels.y + 170 }); KIT.ago(egf, 0, '07:45');
    // yesterday's day note, with an entry filed to the gels (what DAY.file does)
    const yd = KIT.day(1), yEntry = DAY.add('Gel batch 14 came out even: 30 kPa across the plate.', 'observation', yd), it = M.createItem('observation', yEntry.body.text, gels, { fromDay: { docId: yEntry.docId, blockId: yEntry.id, date: yd } });
    yEntry.filed = [{ itemId: it.id, blockId: gels.id, at: isoLocal(KIT.at(1, '17:05')) }]; DB.put('blocks', yEntry);
    DAY.add('Edge of the sheet looks thinner at 10 ng/mL EGF.', 'observation'); DAY.add('Order more fibronectin before run 4.', 'reminder');
    KIT.done(); return { A: A.id, gels: gels.id, img: img.id, egf: egf.id, day: DAY.doc().id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['The run note: the component filed from yesterday’s day note carries a chip that says where it came from', async (R, c) => {
      await R.move({ sel: `.box[data-id="${c.gels}"] .chips .dschip` });
      await R.sleep(1800);
    }],
    ['Capture a thought with the pencil in the header: it lands in today’s day note', async (R, c) => {
      await R.click('#capture');
      await R.until(`!!document.querySelector('.ovl.capture textarea')`, 3000);
      await R.type('Beads drift less when imaging starts 2 min after trypsin.', 28);
      await R.sleep(500);
      await R.click({ sel: '.ovl.capture .btn.pri', text: 'Add' });
      await R.sleep(500);
      await R.go('#/doc/' + c.day);
      c.cap = await R.ev(`const b = DAY.entries(DAY.doc()).find(x => x.body.text.startsWith('Beads drift less')); return b && b.id`);
      await R.until(`!!document.querySelector('.box[data-id="${c.cap}"]')`, 4000);
      await R.wheel(300, [900, 330]);   // the new entry up, clear of the dock
      await R.sleep(1000);
    }],
    ['In the day note, ⋯ → File to a component…: pick the Imaging step of the run note', async (R, c) => {
      await R.click(`.box[data-id="${c.cap}"] .bmore`);
      await R.ev(`const o = [...document.querySelectorAll('.pop .op')].find(e => e.textContent.includes('File to a component')); o.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.click({ sel: '.pop .op', text: 'File to a component' });
      await R.until(`!!document.querySelector('.pk-q')`, 3000);
      await R.type('imaging', 60);
      await R.sleep(500);
      await R.click({ sel: '.opts .opt', text: 'Imaging' });
      await R.sleep(1500);
    }],
    ['The entry stays in its day, with a chip to where it went; the component gains the day it was filed from', async (R, c) => {
      await R.move({ sel: `.box[data-id="${c.cap}"] .chips .dschip` });
      await R.sleep(1200);
      await R.open(c.A);
      await R.move({ sel: `.box[data-id="${c.img}"] .chips .dschip` });
      await R.sleep(1800);
    }],
  ],
};
