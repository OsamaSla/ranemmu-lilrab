/**
 * Builds content/staging-en-de-001-020.xlsx — PILOT review file, NOT live.
 * Three sheets: Arabic reference (copy of live rows 1-20) + EN/DE drafts.
 * Every draft row is marked DRAFT/ENTWURF in Notes. Nothing here ships
 * until the reviewer corrects it and it is merged into hymns-imported.xlsx.
 *
 * Shape rule (importer-enforced): EN/DE stanzas must mirror Arabic 1:1.
 * This script asserts line counts against book-hymns-imported.json and
 * aborts before writing if any stanza mismatches.
 */
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(CONTENT, 'staging-en-de-001-020.xlsx');

const AR = JSON.parse(readFileSync(join(CONTENT, 'book-hymns-imported.json'), 'utf8')).hymns;
const byNum = new Map(AR.map((h) => [h.number, h]));

/**
 * Pilot drafts. `v` = verses in Arabic order; r:true = refrain stanza.
 * EN leans toward the hymnary English original where the hymn is a known
 * translation; otherwise a plain faithful rendering. ALL marked DRAFT.
 */
const PILOT = [
{ n: 1, ten: 'For Our God We Pave a Way', tde: 'Für unseren Gott bahnen wir den Weg', v: [
{ r: false, en: ['For our God we pave a way', 'And our shout breaks down walls', 'In the desert and in distress', 'We sing to righteous Jesus', 'In the name of our God, in our Redeemer\u2019s name', 'Raising high the victory banner'],
  de: ['Für unseren Gott bahnen wir den Weg', 'Und unser Rufen bricht Mauern nieder', 'In der Wüste und in der Bedrängnis', 'Singen wir dem gerechten Jesus', 'Im Namen unseres Gottes, im Namen unseres Erlösers', 'Erheben wir das Siegesbanner'] },
{ r: true, en: ['You who dwell among us', 'Amid our shouts and songs', 'You are the source of our joys', 'And our peace that fills us'],
  de: ['Du, der du unter uns wohnst', 'Inmitten unseres Rufens und Singens', 'Du bist die Quelle unserer Freuden', 'Und unser Friede, der uns erfüllt'] },
{ r: false, en: ['We are Your victorious people', 'And by Your blood we overcome', 'By our shout the foe is bound', 'And Satan\u2019s reign we crush', 'You are our King and our Leader', 'And in our battle we triumph'],
  de: ['Wir sind dein siegreiches Volk', 'Und durch dein Blut überwinden wir', 'Durch unser Rufen ist der Feind gebunden', 'Und Satans Herrschaft zertreten wir', 'Du bist unser König und unser Anführer', 'Und in unserem Kampf triumphieren wir'] },
{ r: false, en: ['All our days are joys', 'Our nights are feasts for Jesus', 'And You secure our joys', 'And You are our hope, O Jesus', 'Crossing over, we with our praise', 'Turn the valley into a spring'],
  de: ['Alle unsere Tage sind Freuden', 'Unsere Nächte sind Feste für Jesus', 'Und du sicherst unsere Freuden', 'Und du bist unsere Hoffnung, o Jesus', 'Hinüberziehend verwandeln wir mit unserem Lob', 'Das Tal in eine Quelle'] },
]},
{ n: 2, ten: 'Hallelujah, I Am Precious', tde: 'Halleluja, ich bin kostbar', v: [
{ r: false, en: ['Hallelujah, I am precious', 'In Your eyes my place is kept', 'My beauty never fades away', '(Not for a moment from Your eyes)'],
  de: ['Halleluja, ich bin kostbar', 'In deinen Augen ist mein Platz bewahrt', 'Meine Schönheit vergeht niemals', '(Keinen Augenblick vor deinen Augen)'] },
{ r: false, en: ['Hallelujah, You are my righteousness', 'Despite my shame You are my covering', 'You are not ashamed, as You promised', '(To be mine, and I Yours)'],
  de: ['Halleluja, du bist meine Gerechtigkeit', 'Trotz meiner Schande bist du meine Decke', 'Du schämst dich nicht, wie du versprochen hast', '(Mein zu sein, und ich dein)'] },
{ r: false, en: ['Hallelujah, in You is my healing', 'Despite my lack, despite my sickness', 'Despite every wound in my soul', '(My cure is in Your hands)'],
  de: ['Halleluja, in dir ist meine Heilung', 'Trotz meines Mangels, trotz meiner Krankheit', 'Trotz jeder Wunde in meiner Seele', '(Meine Heilung ist in deinen Händen)'] },
{ r: false, en: ['Hallelujah, that I am Your child', 'That I am Yours, that I am Your own', 'Not for anything good in me', '(It is love dwelling in You)'],
  de: ['Halleluja, dass ich dein Kind bin', 'Dass ich dein bin, dass ich dein Eigentum bin', 'Nicht wegen etwas Gutem in mir', '(Es ist Liebe, die in dir wohnt)'] },
]},
{ n: 3, ten: 'Leaving All My Cares With You', tde: 'All meine Sorgen lasse ich bei dir', v: [
{ r: false, en: ['Leaving all my cares with You', 'O You who engraved me on Your palms', 'You are my peace, and in my pains', 'And in distress Your eyes see me'],
  de: ['All meine Sorgen lasse ich bei dir', 'Der du mich in deine Hände gezeichnet hast', 'Du bist mein Friede, und in meinen Schmerzen', 'Und in der Not sehen mich deine Augen'] },
{ r: true, en: ['O Giver of songs', 'In my night and my sorrows', 'O Guarantor of my hopes', 'O Jesus my Shepherd'],
  de: ['O Geber der Lieder', 'In meiner Nacht und meinen Sorgen', 'O Bürge meiner Hoffnungen', 'O Jesus mein Hirte'] },
{ r: false, en: ['My hard hour \u2014 I will sing in it', 'My joy is strength, why should I hide it?!', 'No man and no demon', 'Can take a joy that You have given'],
  de: ['Meine schwere Stunde \u2014 ich will darin singen', 'Meine Freude ist Kraft, warum verbergen?!', 'Kein Mensch und kein Dämon', 'Kann mir Freude nehmen, die du gegeben hast'] },
{ r: false, en: ['Lifting my hands, I surrender to You', 'My life\u2019s rudder belongs to Your hands', 'Many said: where is the good?!', 'But You are the good, and I live in You'],
  de: ['Mit erhobenen Händen ergebe ich mich dir', 'Das Steuer meines Lebens gehört deinen Händen', 'Viele sagten: Wo ist das Gute?!', 'Doch du bist das Gute, und ich lebe in dir'] },
{ r: false, en: ['Tears lingered between the eyelids', 'And with the morning came melodies', 'Victories and testimonies', 'Your victory march is ours as well'],
  de: ['Tränen weilten zwischen den Lidern', 'Und mit dem Morgen kamen Melodien', 'Siege und Zeugnisse', 'Dein Siegeszug gehört auch uns'] },
]},
{ n: 4, ten: 'O My God, Your Righteousness Reaches High', tde: 'O mein Gott, deine Gerechtigkeit reicht hoch', v: [
{ r: false, en: ['O my God, Your righteousness reaches on high', 'Your kingdom and Your holiness are in heaven', 'You came down to us that we may see You', 'There is none but You'],
  de: ['O mein Gott, deine Gerechtigkeit reicht bis zur Höhe', 'Dein Reich und deine Heiligkeit sind im Himmel', 'Du kamst zu uns herab, damit wir dich sehen', 'Es gibt keinen außer dir'] },
{ r: true, en: ['My God, who but You removes the distress', 'My God, who but You can give me hope', 'My God, who but You can guide to life', 'My God, none but You \u2014 there is none but You'],
  de: ['Mein Gott, wer außer dir nimmt die Not hinweg', 'Mein Gott, wer außer dir gibt mir Hoffnung', 'Mein Gott, wer außer dir führt zum Leben', 'Mein Gott, keiner außer dir \u2014 es gibt keinen außer dir'] },
{ r: false, en: ['Amid pitch-black ignorance and the night of despair', 'Amid a dark desert and the shadow of death', 'You labour in love and light the soul\u2019s depths', 'There is none but You'],
  de: ['Inmitten pechschwarzer Unwissenheit und der Nacht der Verzweiflung', 'Inmitten dunkler Wüste und Todesschatten', 'Wirkst du in Liebe und erleuchtest der Seele Tiefen', 'Es gibt keinen außer dir'] },
{ r: false, en: ['Who but You in life, O Almighty One', 'Whom have I but You as King and Helper', 'My heart declares and my days bear witness', 'There is none but You'],
  de: ['Wer außer dir im Leben, o Allmächtiger', 'Wen habe ich außer dir als König und Helfer', 'Mein Herz bekennt es und meine Tage bezeugen es', 'Es gibt keinen außer dir'] },
]},
{ n: 5, ten: 'My God, My God, Be My Guide', tde: 'Mein Gott, mein Gott, sei mein Führer', v: [
{ r: false, en: ['My God, my God, be my Guide', 'On the way of the cross, that I may follow', 'I see You weak, yet You are the Strong', 'Pardoning and forgiving every aggressor'],
  de: ['Mein Gott, mein Gott, sei mein Führer', 'Auf dem Kreuzweg, dass ich folge', 'Ich sehe dich schwach, doch du bist der Starke', 'Der jedem Angreifer verzeiht und vergibt'] },
{ r: true, en: ['Do with me as You will', 'You are my only Companion', 'You have become my refuge in all distress', 'To You I hasten and in You I hide'],
  de: ['Tue mit mir, was du willst', 'Du bist mein einziger Gefährte', 'Du bist meine Zuflucht in aller Not geworden', 'Zu dir eile ich und in dir berge ich mich'] },
{ r: false, en: ['Behold the shameful cross \u2014 You carried it', 'With all honour You lifted it high', 'To Golgotha, where You set it down', 'On a lofty hill You fixed it fast'],
  de: ['Siehe das schmachvolle Kreuz \u2014 du trugst es', 'Mit aller Ehre hobst du es empor', 'Nach Golgatha, wo du es niedersetztest', 'Auf hohem Hügel befestigtest du es'] },
{ r: false, en: ['You laid Yourself on the shameful cross', 'Yielding to it with all resolve', 'I hear Your heartbeat with the hammer of the nail', 'Proclaiming Your love to me, O Holy, O Righteous'],
  de: ['Du legtest dich selbst auf das schmachvolle Kreuz', 'Ergabst dich ihm mit aller Entschlossenheit', 'Ich höre deinen Herzschlag mit dem Hammer des Nagels', 'Der mir deine Liebe verkündet, o Heiliger, o Gerechter'] },
{ r: false, en: ['O what a wondrous divine mystery', 'That I share the Beloved\u2019s nature', 'His love\u2019s whispers melt the heart', 'I am His captive, and He is my portion'],
  de: ['O welch wundersames göttliches Geheimnis', 'Dass ich an des Geliebten Natur teilhabe', 'Das Flüstern seiner Liebe schmilzt das Herz', 'Ich bin sein Gefangener, und er ist mein Anteil'] },
]},
{ n: 6, ten: 'In Trial I Find None More Tender', tde: 'In der Not finde ich keinen Zärtlicheren', v: [
{ r: false, en: ['In times of trial I find none more tender', 'Than You, O Lord, to hold me close', 'You surely come, and I am made glad', 'And I feel You giving me strength', 'You hear and heal, You give and it suffices', 'And Your word overflows with tenderness', 'And I find You before me, my rest and my peace', '(My light and fountain of safety)'],
  de: ['In Zeiten der Not finde ich keinen Zärtlicheren', 'Als dich, o Herr, der mich umfängt', 'Du kommst gewiss, und ich werde froh', 'Und ich spüre, wie du mich stärkst', 'Du hörst und heilst, du gibst und es genügt', 'Und dein Wort fließt über vor Zärtlichkeit', 'Und ich finde dich vor mir, meine Ruhe und mein Friede', '(Mein Licht und Quell der Geborgenheit)'] },
{ r: false, en: ['All the comforts of the past', 'Testify to Your faithful promise', 'Living with a presence without bounds', 'Loosing the bonds of the weary', 'I touch Your presence, Your goodness and being', 'Despite hardships, however they grow', 'I witness to Your love, Your flood and fullness', '(My hope is in You alone, for sure)'],
  de: ['All die Tröstungen der Vergangenheit', 'Bezeugen deine treue Verheißung', 'Lebendig mit einer Gegenwart ohne Grenzen', 'Die die Fesseln der Müden löst', 'Ich berühre deine Gegenwart, deine Güte und dein Sein', 'Trotz der Schwierigkeiten, wie sehr sie wachsen', 'Ich bezeuge deine Liebe, deine Flut und Fülle', '(Meine Hoffnung ist in dir allein, gewiss)'] },
]},
{ n: 7, ten: 'Righteous Jesus Set Me Free', tde: 'Der gerechte Jesus befreite mich', v: [
{ r: false, en: ['Righteous Jesus set me free', 'Joyful always, continually', 'He taught me to trust in Him', 'For He promised me and said:'],
  de: ['Der gerechte Jesus befreite mich', 'Fröhlich allezeit, beständig', 'Er lehrte mich zu vertrauen', 'Denn er verhieß mir und sprach:'] },
{ r: true, en: ['You are My child, washed in the blood', 'And you shall never carry worry'],
  de: ['Du bist mein Kind, gewaschen im Blut', 'Und du sollst niemals Sorgen tragen'] },
{ r: false, en: ['Satan comes to fight against me', 'Jesus tells him: he is My child', 'And I promised to guard him', 'My eye is ever upon him'],
  de: ['Satan kommt, um gegen mich zu kämpfen', 'Jesus sagt ihm: Er ist mein Kind', 'Und ich habe versprochen, ihn zu behüten', 'Mein Auge ist allezeit auf ihm'] },
{ r: false, en: ['Since the day the Lord saved me', 'Eternal life He gave to me', 'And life with Him delights me', 'I have become His precious child'],
  de: ['Seit dem Tag, da der Herr mich rettete', 'Ewiges Leben gab er mir', 'Und das Leben mit ihm erfreut mich', 'Ich bin sein kostbares Kind geworden'] },
]},
{ n: 8, ten: 'For My Lips, O Lord', tde: 'Für meine Lippen, o Herr', v: [
{ r: false, en: ['For my lips, O Lord, You are', 'The tune of heaven\u2019s melodies', 'Praise lifts me on high until', 'It grants the soul its comfort'],
  de: ['Für meine Lippen, o Herr, bist du', 'Die Weise der Himmelsmelodien', 'Das Lob hebt mich empor, bis', 'Es der Seele Trost gewährt'] },
{ r: true, en: ['All my senses lift their voice', 'And shout aloud to You', 'Mind and lips \u2014 heart and life', 'All belong to You'],
  de: ['Alle meine Sinne erheben ihre Stimme', 'Und rufen dir zu', 'Verstand und Lippen \u2014 Herz und Leben', 'Alles gehört dir'] },
{ r: false, en: ['For my eyes, O my God, You are', 'A dawn that wipes away the dark', 'You shine upon my every path', 'So I walk ever forward'],
  de: ['Für meine Augen, o mein Gott, bist du', 'Ein Morgen, der das Dunkel wischt', 'Du bescheinst jeden meiner Wege', 'So schreite ich stets voran'] },
{ r: false, en: ['For my ears, O Lord, You are', 'The sound of songs of peace', 'Entering the soul, it heals', 'Every wound completely'],
  de: ['Für meine Ohren, o Herr, bist du', 'Der Klang der Friedenslieder', 'Der in die Seele dringt und heilt', 'Jede Wunde völlig'] },
{ r: false, en: ['In my heart, O my God, You are', 'An overflow of generous love', 'Every love in this life', 'Apart from Yours is vanity'],
  de: ['In meinem Herzen, o mein Gott, bist du', 'Ein Überfluss großzügiger Liebe', 'Jede Liebe in diesem Leben', 'Außer deiner ist Nichtigkeit'] },
]},
{ n: 9, ten: 'The Hearts of Kings Are Streams', tde: 'Die Herzen der Könige sind Wasserbäche', v: [
{ r: false, en: ['The hearts of kings are streams of water', 'In God\u2019s hand, He turns them as He wills', 'Whatever the Almighty Lord decrees', 'Swiftly in its season shall come to pass'],
  de: ['Die Herzen der Könige sind Wasserbäche', 'In Gottes Hand, er lenkt sie, wie er will', 'Was immer der allmächtige Herr beschließt', 'Geschieht eilends zu seiner Zeit'] },
{ r: true, en: ['From the rising of the sun to its setting', 'Your name is praised, O our God'],
  de: ['Vom Aufgang der Sonne bis zu ihrem Niedergang', 'Wird dein Name gepriesen, o unser Gott'] },
{ r: false, en: ['Who spoke, and it was, without Your command?', 'Who ordered, and it stood, without Your knowledge?', 'And You are the Exalted, You are the Awesome One', 'Maker of the world, Lord of the peoples'],
  de: ['Wer sprach, und es geschah, ohne dein Gebot?', 'Wer befahl, und es stand, ohne dein Wissen?', 'Und du bist der Erhabene, du bist der Furchtgebietende', 'Schöpfer der Welt, Herr der Völker'] },
{ r: false, en: ['You alone are strong, O Lord of hosts', 'You alone are great, a reigning King', 'Yours are the heavens and also the earth', 'And all creation bows to You'],
  de: ['Du allein bist stark, o Herr der Heerscharen', 'Du allein bist groß, ein regierender König', 'Dein sind die Himmel und auch die Erde', 'Und alle Schöpfung betet dich an'] },
]},
{ n: 10, ten: 'Lord, for the Weary You Are Refuge', tde: 'Herr, für die Müden bist du Zuflucht', v: [
{ r: false, en: ['Lord, for the weary You are', 'A refuge at every hour', 'For in Your warm embrace', 'There is rest for the tired', 'And I, O Lord, am weary', 'My sins have multiplied', 'Will You renew my life', 'And blot out my sin?'],
  de: ['Herr, für die Müden bist du', 'Eine Zuflucht zu jeder Stunde', 'Denn in deiner warmen Umarmung', 'Ist Ruhe für die Erschöpften', 'Und ich, o Herr, bin müde', 'Meine Sünden sind zahlreich geworden', 'Willst du mein Leben erneuern', 'Und meine Sünde austilgen?'] },
{ r: true, en: ['Come to Me, hasten here', 'You shall find peace with Me', 'O My child, hurry to Me', 'You shall be fully saved'],
  de: ['Komm zu mir, eile her', 'Bei mir wirst du Frieden finden', 'O mein Kind, eile zu mir', 'Du sollst völlig gerettet werden'] },
{ r: false, en: ['My heart has grown so gloomy', 'It has strayed about in darkness', 'My soul longs for a love', 'That grants my heart its life', 'Your love bestows that life', 'O glorious Lord', 'Your Spirit renews \u2014 indeed', 'Creates a heart brand new'],
  de: ['Mein Herz ist so düster geworden', 'Es irrte umher in der Finsternis', 'Meine Seele sehnt sich nach einer Liebe', 'Die meinem Herzen Leben schenkt', 'Deine Liebe schenkt dieses Leben', 'O herrlicher Herr', 'Dein Geist erneuert \u2014 ja', 'Schafft ein brandneues Herz'] },
]},
{ n: 11, ten: 'The Young Lions May Go Hungry', tde: 'Die jungen Löwen mögen hungern', v: [
{ r: false, en: ['The young lions may go hungry', 'And the lions may die of hunger', 'But the sweet Lord can never', 'Leave His child to feel hunger'],
  de: ['Die jungen Löwen mögen hungern', 'Und die Löwen mögen vor Hunger sterben', 'Doch der süße Herr kann niemals', 'Sein Kind Hunger leiden lassen'] },
{ r: true, en: ['Why do you worry, why do you fear', 'While the Shepherd of the sheep is with you', 'Who promised in His mercy to carry', 'All His sheep upon His shoulders?'],
  de: ['Warum sorgst du dich, warum fürchtest du dich', 'Während der Hirte der Schafe bei dir ist', 'Der in seiner Barmherzigkeit verhieß zu tragen', 'Alle seine Schafe auf seinen Schultern?'] },
{ r: false, en: ['Amid your tears, amid your groaning', 'My tender heart groans along with you', 'I wound and I bind, I crush and I heal', 'Do not fear \u2014 I shall never forget you'],
  de: ['Inmitten deiner Tränen, inmitten deines Stöhnens', 'Stöhnt mein zartes Herz mit dir', 'Ich verwunde und verbinde, ich zermalme und heile', 'Fürchte dich nicht \u2014 ich werde dich nie vergessen'] },
{ r: false, en: ['He opens His hand and pours Himself out', 'He cannot bear His child deprived', 'He gives richly, with love and wisdom', 'He gives His beloved even in sleep'],
  de: ['Er öffnet seine Hand und gießt sich selbst aus', 'Er erträgt nicht, dass sein Kind darbt', 'Er gibt reichlich, mit Liebe und Weisheit', 'Er gibt seinem Geliebten selbst im Schlaf'] },
]},
{ n: 12, ten: 'Never Think That I Forgot You', tde: 'Denke nie, dass ich dich vergaß', v: [
{ r: false, en: ['Never think that I forgot you', 'Never think that I am far away', 'With My precious blood I bought you', 'I granted you a life brand new'],
  de: ['Denke nie, dass ich dich vergaß', 'Denke nie, dass ich fern bin', 'Mit meinem kostbaren Blut erkaufte ich dich', 'Ich schenkte dir ein brandneues Leben'] },
{ r: true, en: ['O My child, rest assured, never fear', 'I am Jesus, the Shepherd of the sheep'],
  de: ['O mein Kind, sei getrost, fürchte dich nie', 'Ich bin Jesus, der Hirte der Schafe'] },
{ r: false, en: ['My eyes are ever on the flock', 'With Me are joy and rest, freely given', 'Though a mother forget her nursing babe', 'I, Jesus, shall never forget'],
  de: ['Meine Augen sind allezeit auf der Herde', 'Bei mir sind Freude und Ruhe, umsonst', 'Auch wenn eine Mutter ihren Säugling vergisst', 'Ich, Jesus, werde nie vergessen'] },
]},
{ n: 13, ten: 'Why Do You Carry Your Worries', tde: 'Warum trägst du deine Sorgen', v: [
{ r: true, en: ['I beg you, My child, come here', 'Cast your burdens upon Me', 'Not one moment did I forget you', 'Your grief has grieved Me', 'Your tears have kindled Me', 'For your sake I have wept'],
  de: ['Ich bitte dich, mein Kind, komm her', 'Wirf deine Lasten auf mich', 'Keinen Augenblick vergaß ich dich', 'Dein Kummer hat mich betrübt', 'Deine Tränen haben mich entzündet', 'Um deinetwillen habe ich geweint'] },
{ r: false, en: ['Why do you carry your worries', 'Why do you lay the blame on Me', 'While I am wronged along with you', 'And I have never left you', 'And why forget the cross', 'And My outpoured blood', 'And My dreadful tomb', 'While I have never left you?'],
  de: ['Warum trägst du deine Sorgen', 'Warum gibst du mir die Schuld', 'Während ich mit dir verkannt bin', 'Und ich dich nie verlassen habe', 'Und warum vergisst du das Kreuz', 'Und mein vergossenes Blut', 'Und mein furchtbares Grab', 'Während ich dich nie verlassen habe?'] },
{ r: false, en: ['Rejoice, My child, here and now', 'And remember that it was I', 'Who emptied Myself here below', 'To grant you life indeed', 'I make you forget the woeful years', 'So rejoice at every hour', 'And remember I am your Helper', 'To you, throughout your life'],
  de: ['Freue dich, mein Kind, hier und jetzt', 'Und denke daran, dass ich es war', 'Der sich hier unten entäußerte', 'Um dir wahrhaft Leben zu schenken', 'Ich lasse dich die kummervollen Jahre vergessen', 'So freue dich zu jeder Stunde', 'Und denke daran: Ich bin dein Helfer', 'Für dich, dein Leben lang'] },
]},
{ n: 14, ten: 'What Comforts Me in All My Pain', tde: 'Was mich in allem Schmerz tröstet', v: [
{ r: false, en: ['What comforts me for all my pains', 'Is that Jesus is with me, securing my peace'],
  de: ['Was mich in allen meinen Schmerzen tröstet', 'Ist, dass Jesus bei mir ist und meinen Frieden sichert'] },
{ r: true, en: ['He cares for me \u2014 Jesus is my Shepherd', 'Ordering my affairs, His eye upon me'],
  de: ['Er sorgt für mich \u2014 Jesus ist mein Hirte', 'Er ordnet meine Wege, sein Auge auf mir'] },
{ r: false, en: ['What calms me and dispels my darkness', 'Is that Jesus is with me, healing my sickness'],
  de: ['Was mich beruhigt und meine Finsternis vertreibt', 'Ist, dass Jesus bei mir ist und meine Krankheit heilt'] },
{ r: false, en: ['What cheers me and binds my wounds', 'Is that I call my Lord, and He hears my cry'],
  de: ['Was mich aufrichtet und meine Wunden verbindet', 'Ist, dass ich meinen Herrn rufe, und er hört mein Schreien'] },
]},
{ n: 15, ten: 'What Shall I Render, O Beloved', tde: 'Was soll ich dir vergelten, o Geliebter', v: [
{ r: false, en: ['What shall I render to You, O Beloved', 'My silver and my gold?', 'What are these for the cross\u2019s sufferings', 'What are these for the toil!', 'All is from You, and You became for me', 'A wondrous fountain of redemption', 'You are my life, O You who came to me', 'Snatching my soul from the flame'],
  de: ['Was soll ich dir vergelten, o Geliebter', 'Mein Silber und mein Gold?', 'Was sind diese für die Leiden des Kreuzes', 'Was sind sie für die Mühsal!', 'Alles ist von dir, und du wurdest mir', 'Ein wundersamer Quell der Erlösung', 'Du bist mein Leben, der du zu mir kamst', 'Meine Seele der Flamme entreißend'] },
{ r: true, en: ['You seated me, O Lord, in heaven', 'You made me forget distress through Your love', 'You lit my darkness and took my anguish away', 'You saved me, You bore my curse'],
  de: ['Du setztest mich, o Herr, in den Himmel', 'Durch deine Liebe ließest du mich die Not vergessen', 'Du erleuchtetest meine Finsternis und nahmst meine Angst hinweg', 'Du rettetest mich, du trugst meinen Fluch'] },
{ r: false, en: ['With Your voice, O Lord, You called me', 'From the grave of my shameful sin', 'You quickened me, then made me holy', 'With an overflow of precious blood', 'You poured a glorious Spirit into me', 'To lead me evermore', 'That I may live in a covenant new', 'And never turn back to the dark'],
  de: ['Mit deiner Stimme, o Herr, riefst du mich', 'Aus dem Grab meiner schändlichen Sünde', 'Du belebtest mich, dann heiligtest du mich', 'Mit einem Überfluss kostbaren Blutes', 'Du gossest einen herrlichen Geist in mich aus', 'Um mich immerdar zu leiten', 'Dass ich in einem neuen Bunde lebe', 'Und nie zur Finsternis zurückkehre'] },
{ r: false, en: ['In weakness Your strength is made complete', 'In sorrow my comfort comes from You', 'For since You dwell in me, I shall labour on', 'And never mind the hardship', 'Proclaiming to sinners the One', 'Who renewed all believers', 'That they may receive a portion too', 'As I received, shouting and saying\u2026'],
  de: ['In der Schwachheit wird deine Kraft vollendet', 'In der Trauer kommt mein Trost von dir', 'Denn weil du in mir wohnst, will ich weiterwirken', 'Und die Mühsal nicht achten', 'Den Sündern verkündend den Einen', 'Der alle Gläubigen erneuerte', 'Dass auch sie Anteil empfangen', 'Wie ich empfing, rufend und sprechend\u2026'] },
]},
{ n: 16, ten: 'Trample On, O Soul, With Courage', tde: 'Zertritt, o Seele, mit Mut', v: [
{ r: false, en: ['Trample on, O soul, with courage', 'Ever upon the devil\u2019s head', 'I shall never, never waver', 'For Jesus has given me faith'],
  de: ['Zertritt, o Seele, mit Mut', 'Allezeit des Teufels Haupt', 'Ich werde niemals, niemals wanken', 'Denn Jesus hat mir Glauben gegeben'] },
{ r: true, en: ['And though the world should rage around me', 'Satan shall never prevail over me', 'As long as Jesus holds my hand', 'And my faith: His arm is strong'],
  de: ['Und wenn die Welt um mich tobt', 'Soll Satan nie über mich siegen', 'Solange Jesus meine Hand hält', 'Und mein Glaube: Sein Arm ist stark'] },
{ r: false, en: ['With Jesus I defy the fire', 'And walk amid the furnace flames', 'My faith can shake the ramparts', 'And lay the strongholds low'],
  de: ['Mit Jesus trotze ich dem Feuer', 'Und wandle in des Ofens Glut', 'Mein Glaube kann die Mauern erschüttern', 'Und die Festungen niederreißen'] },
{ r: false, en: ['I shall never bow my head down', 'For my Lord\u2019s cross uplifts me', 'Jesus is my shield and my salvation', 'His Spirit\u2019s power emboldens me'],
  de: ['Ich werde mein Haupt niemals beugen', 'Denn meines Herrn Kreuz hebt mich empor', 'Jesus ist mein Schild und mein Heil', 'Seines Geistes Kraft macht mir Mut'] },
]},
{ n: 17, ten: 'Lord, Who Have I in My Perplexity', tde: 'Herr, wen habe ich in meiner Ratlosigkeit', v: [
{ r: false, en: ['Lord, who have I in my perplexity', 'I wonder \u2014 is there an answer for me?', 'And shall I know it even now', 'Or when I rise above the clouds?'],
  de: ['Herr, wen habe ich in meiner Ratlosigkeit', 'Ich frage mich \u2014 gibt es Antwort für mich?', 'Und werde ich es schon jetzt erfahren', 'Oder wenn ich über die Wolken steige?'] },
{ r: true, en: ['Amid my many anxious cares', '(Within me Your comforts delight my soul)'],
  de: ['Inmitten meiner vielen ängstlichen Sorgen', '(Erquicken deine Tröstungen meine Seele)'] },
{ r: false, en: ['I asked: what is the secret of my grief?', 'And in my exile, for whom do I hope?', 'My God, You are my hiding place', 'To You my heart ascends'],
  de: ['Ich fragte: Was ist das Geheimnis meines Grams?', 'Und in meiner Fremde, auf wen hoffe ich?', 'Mein Gott, du bist meine Zuflucht', 'Zu dir steigt mein Herz empor'] },
{ r: false, en: ['And though I cannot comprehend', 'What You are working within me', 'I have no doubt at all that I', 'Am content in You, O Lord'],
  de: ['Und auch wenn ich nicht begreife', 'Was du in mir wirkst', 'Zweifle ich doch keineswegs, dass ich', 'In dir zufrieden bin, o Herr'] },
]},
{ n: 18, ten: 'He Passed By and Found Me', tde: 'Er ging vorbei und fand mich', v: [
{ r: false, en: ['He passed by me and found me', 'And love\u2019s season was my season', '(He granted me salvation freely', 'O my bliss and my heart\u2019s joy!)'],
  de: ['Er ging an mir vorbei und fand mich', 'Und der Liebe Zeit war meine Zeit', '(Er schenkte mir umsonst das Heil', 'O meine Wonne und meines Herzens Freude!)'] },
{ r: false, en: ['He came from heaven down for me', 'And with His sweet voice He called me', '(He has prepared my dwelling place', 'O my bliss and my heart\u2019s joy!)'],
  de: ['Er kam vom Himmel herab für mich', 'Und mit seiner süßen Stimme rief er mich', '(Er hat mir die Wohnstatt bereitet', 'O meine Wonne und meines Herzens Freude!)'] },
{ r: false, en: ['The world is a moment, and it passes', 'And my sighing and all my sorrow \u2014', '(While I wait for my Beloved', 'O my bliss and my heart\u2019s joy!)'],
  de: ['Die Welt ist ein Augenblick, und sie vergeht', 'Und mein Seufzen und all mein Kummer \u2014', '(Während ich auf meinen Geliebten warte', 'O meine Wonne und meines Herzens Freude!)'] },
{ r: false, en: ['Had they but known what I have known', 'And tasted what I have tasted', '(They would shout as I have shouted:', 'O my bliss and my heart\u2019s joy!)'],
  de: ['Hätten sie nur erkannt, was ich erkannt habe', 'Und geschmeckt, was ich geschmeckt habe', '(Sie würden rufen, wie ich gerufen habe:', 'O meine Wonne und meines Herzens Freude!)'] },
]},
{ n: 19, ten: 'Walking With Me, Never Forgetting', tde: 'Mit mir wandelnd, nie vergessend', v: [
{ r: false, en: ['Walking with me, never forgetting me', 'Filling my life with cheers and songs', 'Though a mother forget her suckling babe', 'You never, ever forget me'],
  de: ['Mit mir wandelnd, mich nie vergessend', 'Mein Leben füllend mit Jubel und Liedern', 'Auch wenn eine Mutter ihren Säugling vergisst', 'Vergisst du mich nimmer, niemals'] },
{ r: true, en: ['O You who ransomed me, my Lord, You alone', 'O You who bought my soul with Your blood', 'Who is like You in tenderness of heart', 'Or, O Lord, in the greatness of Your love', 'Who is like You, O Lord?'],
  de: ['Der du mich erlöst hast, mein Herr, du allein', 'Der du meine Seele mit deinem Blut erkauft hast', 'Wer ist wie du an Herzenszärtlichkeit', 'Oder, o Herr, an Größe deiner Liebe', 'Wer ist wie du, o Herr?'] },
{ r: false, en: ['Before me You walked the desert road', 'And tasted every kind of grief', 'Therefore You honour the weight of my pain', 'For You know all that is within me'],
  de: ['Vor mir gingst du den Wüstenweg', 'Und kostetest jede Art von Leid', 'Darum ehrst du das Gewicht meines Schmerzes', 'Denn du kennst alles, was in mir ist'] },
{ r: false, en: ['When I grieve, it is You who comfort me', 'And when I weep, You wipe my tears away', 'All my sorrows flee away from me', 'When You visit me in a moment, my Jesus'],
  de: ['Wenn ich trauere, bist du es, der mich tröstet', 'Und wenn ich weine, wischst du meine Tränen ab', 'Alle meine Leiden fliehen von mir', 'Wenn du mich heimsuchst in einem Augenblick, mein Jesus'] },
]},
{ n: 20, ten: 'Were It Not for the Spear and the Crown', tde: 'Wäre nicht der Speer und die Krone', v: [
{ r: true, en: ['Were it not, O Lord, that You are with us', 'We could not live a single moment', 'Were it not for Your love toward us, O Lord', 'We would long ago have passed and gone'],
  de: ['Wärst du nicht, o Herr, mit uns', 'Könnten wir keinen Augenblick leben', 'Wäre nicht deine Liebe zu uns, o Herr', 'Wären wir längst vergangen und dahin'] },
{ r: false, en: ['Were it not for the spear, were it not for the crown', 'The crown of thorns that wearied You', 'Were it not for Your cross, were it not for Your blood', 'We could never have lived nor seen You'],
  de: ['Wäre nicht der Speer, wäre nicht die Krone', 'Die Dornenkrone, die dich ermüdete', 'Wäre nicht dein Kreuz, wäre nicht dein Blut', 'Hätten wir nie gelebt noch dich geschaut'] },
{ r: false, en: ['Were it not for Your healing word', 'That raises the dead to life', 'The grave would have become our road', 'And death would be our inheritance'],
  de: ['Wäre nicht dein heilendes Wort', 'Das die Toten zum Leben erweckt', 'Wäre das Grab unser Weg geworden', 'Und der Tod unser Erbe'] },
{ r: false, en: ['But, O Lord, when You found us', 'When You found us in the darkness', 'At once Your heart grew tender toward us', 'With all love and all patience'],
  de: ['Doch, o Herr, als du uns fandest', 'Als du uns in der Finsternis fandest', 'Ward dein Herz uns sogleich zärtlich', 'Mit aller Liebe und aller Geduld'] },
]},
];

const AR_HEADERS = ['رقم الترنيمة', 'العنوان', 'مقياس الكلام', 'القرار', 'نوع المقطع', 'رقم المقطع', 'الصَّدْر', 'العَجُز', 'ملاحظات'];
const EN_HEADERS = ['Hymn No.', 'Title', 'Meter', 'Chorus label', 'Kind', 'Stanza No.', 'First half', 'Second half', 'Notes'];
const DE_HEADERS = ['Liednr.', 'Titel', 'Metrum', 'Kehrvers', 'Art', 'Strophennr.', 'Erste Hälfte', 'Zweite Hälfte', 'Notizen'];

function styleSheet(ws, rtl) {
  ws.views = rtl ? [{ rightToLeft: true }] : [{}];
  ws.columns = (rtl ? AR_HEADERS : ws.name.startsWith('EN') ? EN_HEADERS : DE_HEADERS).map((h, i) => ({ header: h, key: `c${i}`, width: [12, 30, 14, 14, 12, 12, 46, 46, 30][i] }));
  const hr = ws.getRow(1);
  hr.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B66' } };
  hr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

// 1. Verify shape against Arabic master; abort on any mismatch.
for (const p of PILOT) {
  const a = byNum.get(p.n);
  if (!a) throw new Error(`hymn ${p.n} not in Arabic master`);
  if (a.verses.length !== p.v.length) throw new Error(`hymn ${p.n}: ${p.v.length} draft stanzas vs ${a.verses.length} Arabic`);
  p.v.forEach((s, i) => {
    const al = a.verses[i].lines.length;
    if (s.en.length !== al) throw new Error(`hymn ${p.n} stanza ${i + 1}: EN ${s.en.length} vs AR ${al}`);
    if (s.de.length !== al) throw new Error(`hymn ${p.n} stanza ${i + 1}: DE ${s.de.length} vs AR ${al}`);
    if (!!a.verses[i].chorus !== s.r) throw new Error(`hymn ${p.n} stanza ${i + 1}: refrain flag vs Arabic`);
  });
}
console.log('shape check passed: 20 hymns mirror Arabic 1:1');

// 2. Build workbook.
const wb = new ExcelJS.Workbook();
wb.creator = 'ranemmu.lilrab EN/DE pilot (DRAFT)';
const wsAr = wb.addWorksheet('ترانيم');
const wsEn = wb.addWorksheet('EN - English');
const wsDe = wb.addWorksheet('DE - Deutsch');
styleSheet(wsAr, true); styleSheet(wsEn, false); styleSheet(wsDe, false);

const hasChorus = (n) => byNum.get(n).verses.some((x) => x.chorus);
const arLabel = (n, i) => `(${byNum.get(n).verses[i].label})`;
const kindOf = (lang, r) => (lang === 'en' ? (r ? 'refrain' : 'verse') : (r ? 'Kehrvers' : 'Strophe'));

// Arabic reference rows (copies of live data, notes point to pilot).
for (const p of PILOT) {
  const a = byNum.get(p.n);
  a.verses.forEach((st, i) => {
    st.lines.forEach((line, j) => {
      wsAr.addRow(j === 0 && i === 0
        ? [p.n, a.title, a.meter ?? '', a.chorus ?? '', st.chorus ? 'لازمة' : 'مقطع', arLabel(p.n, i), line, '', i === 0 ? 'مرجع — راجع EN/DE للمراجعة' : '']
        : [null, null, null, null, st.chorus ? 'لازمة' : 'مقطع', j === 0 ? arLabel(p.n, i) : null, line, '', '']);
    });
  });
}

const DRAFT_EN = 'DRAFT — machine-assisted draft, review required before merge';
const DRAFT_DE = 'ENTWURF — maschinengestützter Entwurf, Prüfung vor dem Zusammenführen erforderlich';

// EN + DE draft rows.
for (const p of PILOT) {
  p.v.forEach((st, i) => {
    st.en.forEach((line, j) => {
      wsEn.addRow(j === 0 && i === 0
        ? [p.n, p.ten, '', hasChorus(p.n) ? 'Refrain' : '', kindOf('en', st.r), arLabel(p.n, i), line, '', DRAFT_EN]
        : [null, null, null, null, kindOf('en', st.r), j === 0 ? arLabel(p.n, i) : null, line, '', j === 0 && i === 0 ? '' : (i === 0 && j === 0 ? '' : '')]);
    });
  });
  p.v.forEach((st, i) => {
    st.de.forEach((line, j) => {
      wsDe.addRow(j === 0 && i === 0
        ? [p.n, p.tde, '', hasChorus(p.n) ? 'Kehrvers' : '', kindOf('de', st.r), arLabel(p.n, i), line, '', DRAFT_DE]
        : [null, null, null, null, kindOf('de', st.r), j === 0 ? arLabel(p.n, i) : null, line, '', '']);
    });
  });
}

for (const ws of [wsAr, wsEn, wsDe]) {
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.font = { name: 'Arial', size: 12 };
    row.alignment = { vertical: 'middle', wrapText: true };
  });
}

await wb.xlsx.writeFile(OUT);
console.log('wrote', OUT);
