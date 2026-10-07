/* Autofeud — search-completion bank.
   Each entry: "query|answer 1|answer 2|...|answer 10", most popular first.
   "display=key,key" sets the words that count as a hit; without "=" every
   meaningful word of the answer counts. Written for the game (not live data),
   school friendly. */
(function (AF) {
  'use strict';

  AF.CATEGORIES = [
    { id: 'questions', name: 'Questions', icon: '❓', color: '#7c5cff' },
    { id: 'animals', name: 'Animals', icon: '🐾', color: '#18b67a' },
    { id: 'food', name: 'Food', icon: '🍕', color: '#ff8a1f' },
    { id: 'culture', name: 'Culture', icon: '🎬', color: '#ff4f9a' },
    { id: 'science', name: 'Science', icon: '🚀', color: '#2f8cff' },
    { id: 'sports', name: 'Sports & Games', icon: '🏆', color: '#f5b400' },
    { id: 'life', name: 'People & Life', icon: '🧑', color: '#ff5a4f' },
    { id: 'school', name: 'School', icon: '📚', color: '#14b8c4' }
  ];

  AF.BANK = {
    questions: [
      'why is the sky|blue|orange at sunset=orange,sunset|red|purple|white|pink|dark at night=dark,black,night|green before a storm=green,storm|grey=grey,gray|yellow',
      'why do we|dream|yawn|sleep|hiccup=hiccup,hiccups|sneeze|sweat|cry|laugh|blink|shiver',
      'how to make|slime|pancakes=pancake,pancakes|money|friends=friend,friends|a paper airplane=paper,airplane,plane|bread|ice cream=ice,cream,icecream|cookies=cookie,cookies|a website=website,site|a sandwich=sandwich',
      'how do i|get taller=taller,tall,height,grow|fall asleep=asleep,sleep|stop hiccups=hiccups,hiccup|get better at drawing=drawing,draw|take a screenshot=screenshot|study for a test=study,test|learn to code=code,coding|make friends=friends,friend|tie a tie=tie|whistle',
      'what is the|meaning of life=meaning,life|biggest animal=animal,biggest|capital of australia=capital,australia,canberra|fastest car=car,fastest|tallest building=building,tallest|longest river=river,longest|date today=date,today|weather=weather|speed of light=light,speed|best game=game,best',
      'is it bad to|sleep with wet hair=wet,hair|crack your knuckles=knuckles,knuckle,crack|eat before bed=bed|drink cold water=cold,water|skip breakfast=breakfast,skip|sit too close to the tv=tv,television,close|swallow gum=gum,swallow|sleep too much=oversleep,much|wake up early=early,wake|eat too much sugar=sugar',
      'what happens if you|swallow gum=gum,swallow|dont sleep=sleep,awake|eat too much candy=candy|touch the sun=sun,touch|fall into a black hole=black,hole|drink salt water=salt|crack your knuckles=knuckles,knuckle|sneeze with your eyes open=sneeze,eyes|stare at the sun=stare|hold your breath=breath,breathe',
      'how long does it take to|learn piano=piano|get to the moon=moon|boil an egg=egg,boil|digest food=digest,food|fall asleep=asleep,sleep|learn a language=language|walk a mile=walk,mile|grow hair=hair,grow|heal a broken bone=bone,broken,heal|charge a phone=phone,charge',
      'why do i|feel tired=tired|get hiccups=hiccups,hiccup|yawn so much=yawn|sneeze in the sun=sneeze|have nightmares=nightmares,nightmare|crave sugar=sugar,crave|feel cold=cold|get headaches=headaches,headache|forget things=forget|dream every night=dream,dreams',
      'can you|see the great wall from space=wall,space,great|sneeze in your sleep=sneeze|breathe in space=breathe,breath|swim in the dead sea=dead,sea,swim|eat snow=snow|fly a kite in the rain=kite|hear the sun=hear|dig to china=dig,china|tickle yourself=tickle|count to a billion=count,billion'
    ],
    animals: [
      'why do cats|purr|knead|like boxes=boxes,box|sleep so much=sleep|hate water=water|have whiskers=whiskers,whisker|meow|land on their feet=land,feet|bring you gifts=gifts,gift|eat grass=grass',
      'can dogs eat|grapes=grapes,grape|bananas=bananas,banana|chocolate|apples=apples,apple|cheese|strawberries=strawberries,strawberry|watermelon|popcorn|peanut butter=peanut,butter|carrots=carrots,carrot',
      'why do dogs|bark|howl|lick you=lick,licking|wag their tails=wag,tail,tails|eat grass=grass|sniff everything=sniff,smell|sleep so much=sleep|chase their tails=chase|tilt their heads=tilt,head|dig holes=dig,holes,hole',
      'how long do|cats live=cats,cat|dogs live=dogs,dog|hamsters live=hamsters,hamster|turtles live=turtles,turtle|goldfish live=goldfish,fish|rabbits live=rabbits,rabbit,bunny|parrots live=parrots,parrot|horses live=horses,horse|elephants live=elephants,elephant|spiders live=spiders,spider',
      'are sharks|mammals=mammals,mammal|fish|dangerous|dinosaurs=dinosaurs,dinosaur|older than trees=trees,tree,older|blind|smart|friendly|endangered|cold blooded=cold,blooded',
      'what do pandas|eat|do all day=day|sound like=sound|look like=look|drink|need to survive=survive|weigh=weigh,weight|do for fun=fun|sleep on=sleep|eat besides bamboo=bamboo,besides',
      'can penguins|fly|swim|breathe underwater=underwater,breathe|live in the arctic=arctic|jump|walk|see in the dark=dark,see|get cold=cold|taste food=taste|recognize their name=name,recognize',
      'why do birds|sing|fly south=south,fly|migrate|chirp in the morning=chirp,morning|fly in a v=v,formation|sit on power lines=power,lines,wire,wires|have feathers=feathers,feather|build nests=nests,nest|lay eggs=eggs,egg|hop',
      'how big is a|blue whale=whale|giraffe|elephant|t rex=rex,trex|megalodon|polar bear=polar,bear|hippo=hippo,hippopotamus|gorilla|great white shark=shark,white|anaconda=anaconda,snake',
      'do fish|sleep|feel pain=pain|drink water=drink,water|have feelings=feelings,feeling|get thirsty=thirsty,thirst|have ears=ears,ear,hear|blink|fart|breathe|get bored=bored'
    ],
    food: [
      'is pizza|healthy|a vegetable=vegetable|from italy=italy,italian|bad for you=bad|a pie=pie|good cold=cold|a sandwich=sandwich|junk food=junk|ok for breakfast=breakfast|gluten free=gluten',
      'best toppings for|pizza|pancakes=pancakes,pancake|ice cream=ice,cream|waffles=waffles,waffle|popcorn|tacos=tacos,taco|hot dogs=hot,dog,dogs,hotdog|burgers=burgers,burger|nachos=nachos,nacho|yogurt=yogurt,yoghurt',
      'why is chocolate|bad for dogs=dogs,dog|so good=good,tasty,delicious|addictive|brown|bitter|expensive|healthy|sweet|melting=melting,melt|called chocolate=called,name',
      'what fruit is|the healthiest=healthiest,healthy|the biggest=biggest,big|the sweetest=sweetest,sweet|red|yellow|green|purple|spiky=spiky,spikes|the smallest=smallest,small|the most popular=popular',
      'can you freeze|bread|milk|cheese|eggs=eggs,egg|bananas=bananas,banana|rice|cooked pasta=pasta|yogurt|cake|potatoes=potatoes,potato',
      'how to cook|pasta|rice|eggs=eggs,egg|steak|bacon|chicken|potatoes=potatoes,potato|broccoli|salmon|quinoa',
      'why are bananas|curved=curved,curve,bent|yellow|radioactive|good for you=healthy|berries=berries,berry|turning brown=brown|called bananas=called,name|sticky|so cheap=cheap|slippery',
      'what goes well with|rice|pasta|chicken|salmon|steak|mac and cheese=mac,macaroni|burgers=burgers,burger|tacos=tacos,taco|soup|pancakes=pancakes,pancake',
      'is it safe to eat|raw cookie dough=dough,cookie|moldy bread=moldy,mold|expired yogurt=expired,yogurt|raw eggs=eggs,egg,raw|sushi|snow|apple seeds=seeds,seed,apple|potato skin=skin,potato|rice left out=rice,left|popcorn kernels=kernels,kernel,popcorn',
      'why does ice cream|give you brain freeze=brain,freeze|melt so fast=melt,fast|make you thirsty=thirsty|taste better in a cone=cone|hurt your teeth=teeth,tooth|make you cold=cold|get icy=icy|taste so good=good,taste|come in so many flavors=flavors,flavor|make you happy=happy'
    ],
    culture: [
      'how to draw|a cat=cat|a dog=dog|anime|a horse=horse|a dragon=dragon|a car=car|a flower=flower|a heart=heart|hands=hands,hand|a person=person,human,people',
      'who invented|the internet=internet|the light bulb=light,bulb,lightbulb|the telephone=telephone,phone|school|the car=car|electricity|pizza|the airplane=airplane,plane|video games=video,games,game|math=math,maths',
      'best video games|of all time=all,time,ever|for kids=kids|on switch=switch,nintendo|for pc=pc,computer|to play with friends=friends,friend|free=free|on phone=phone,mobile|for two players=two,players,2|offline|with a story=story',
      'songs that|make you cry=cry|get stuck in your head=stuck,head|make you happy=happy|went viral=viral|are good to dance to=dance|are good for workouts=workout,workouts|are hard to sing=sing,hard|everyone knows=everyone,knows|start with a whistle=whistle|are about summer=summer',
      'why is minecraft|so popular=popular|blocky=blocky,blocks,block|so laggy=laggy,lag|called minecraft=called,name|good for kids=kids|so fun=fun|not working=working,broken|educational=educational,education|pixelated=pixelated,pixels|so expensive=expensive',
      'how to get better at|drawing=drawing,draw|chess|basketball|math|writing=writing,write|singing=singing,sing|soccer=soccer,football|typing=typing,type|coding=coding,code|piano',
      'what does|lol mean=lol|brb mean=brb|idk mean=idk|goat mean=goat|npc mean=npc|afk mean=afk|gg mean=gg|sus mean=sus|ttyl mean=ttyl|fyi mean=fyi',
      'movies about|dinosaurs=dinosaurs,dinosaur|space|dogs=dogs,dog|robots=robots,robot|time travel=time,travel|sharks=sharks,shark|dragons=dragons,dragon|superheroes=superheroes,superhero,heroes,hero|aliens=aliens,alien|the ocean=ocean,sea',
      'how tall is|the tallest person=tallest,person|lebron james=lebron,james|the eiffel tower=eiffel,tower|mount everest=everest,mount|a giraffe=giraffe|the statue of liberty=statue,liberty|big ben=ben|the empire state building=empire,state|burj khalifa=burj,khalifa|shrek'
    ],
    science: [
      'is pluto a|planet|dwarf planet=dwarf|star|moon|dog|asteroid|comet|god|gas giant=gas,giant|cold planet=cold',
      'how hot is the|sun|earths core=core,earth|lava|moon|surface of venus=venus|mercury|sahara desert=sahara,desert|lightning bolt=lightning,bolt|candle flame=candle,flame|mars',
      'why is mars|red|cold|called mars=called,name|dusty=dusty,dust|dead|smaller than earth=smaller,small|not habitable=habitable,live,life|so far away=far|important|round',
      'how many planets|are there=there|are in the solar system=solar,system|have rings=rings,ring|have moons=moons,moon|are in the universe=universe|can fit in the sun=fit,sun|have life=life|are gas giants=gas|are bigger than earth=bigger,earth|are habitable=habitable',
      'what would happen if the|sun exploded=sun,exploded,explode|moon disappeared=moon,disappeared,disappear|earth stopped spinning=spinning,spin,stopped|internet went down=internet|oceans dried up=oceans,ocean,dried|earth was flat=flat|bees died=bees,bee|dinosaurs were alive=dinosaurs,dinosaur|moon crashed into earth=crashed,crash|earth had rings=rings,ring',
      'why do we have|fingerprints=fingerprints,fingerprint|eyebrows=eyebrows,eyebrow|wisdom teeth=wisdom,teeth|leap years=leap|belly buttons=belly,button,navel|time zones=time,zones,zone|seasons=seasons,season|dreams=dreams,dream|an appendix=appendix|two eyes=two,eyes',
      'how do volcanoes|form|erupt|work|affect the environment=environment|create islands=islands,island|get their names=names,name|go dormant=dormant,die|make rocks=rocks,rock|cause earthquakes=earthquakes,earthquake|look inside=inside',
      'how fast is|light|sound|a cheetah=cheetah|the earth=earth|usain bolt=usain,bolt|a peregrine falcon=falcon,peregrine|a rocket=rocket|the fastest car=car|my internet=internet,wifi|a snail=snail',
      'is water|wet|a liquid=liquid|blue|a compound=compound|an element=element|healthy|renewable|alive|infinite|a mineral=mineral',
      'fun facts about|space|animals=animals,animal|the ocean=ocean,sea|dogs=dogs,dog|cats=cats,cat|the human body=body,human|sharks=sharks,shark|the moon=moon|dinosaurs=dinosaurs,dinosaur|yourself'
    ],
    sports: [
      'who is the best|soccer player=soccer,football|basketball player=basketball|youtuber|superhero=superhero,hero|pokemon|chess player=chess|tennis player=tennis|singer|f1 driver=f1,driver,racing|goalkeeper=goalkeeper,goalie',
      'how to play|chess|guitar|piano|uno|sudoku|checkers|tic tac toe=tic,tac,toe|dominoes=dominoes,domino|minecraft|among us=among',
      'why is soccer|called soccer=called,name|so popular=popular|boring|the best sport=best|90 minutes=90,minutes,ninety|played on grass=grass|so hard=hard|not popular in america=america,usa|so expensive=expensive|fun',
      'how many players|on a soccer team=soccer,football|on a basketball team=basketball|in among us=among|on a volleyball team=volleyball|on a baseball team=baseball|in chess=chess|on a hockey team=hockey|in fortnite=fortnite|on a rugby team=rugby|in uno=uno',
      'is chess a|sport|game|board game=board|olympic sport=olympic,olympics|strategy game=strategy|hobby|skill|math game=math|good for your brain=brain|solved game=solved',
      'fastest|animal|car|runner=runner,human,person|bird|fish|plane=plane,jet|land animal=land|train|roller coaster=roller,coaster|dog breed=dog,breed',
      'how long is a|soccer game=soccer,football|basketball game=basketball|marathon|mile|football field=field|light year=light,year|day on mars=mars|minecraft day=minecraft|year on jupiter=jupiter|hockey game=hockey'
    ],
    life: [
      'how to become a|youtuber|streamer|doctor|pilot|teacher|game developer=developer,game|chef|vet=vet,veterinarian|astronaut|lawyer',
      'how to be|happy|confident|popular|funny|a good friend=friend|productive|more patient=patient|a better person=better,person|smart|organized',
      'how to stop|hiccups=hiccups,hiccup|procrastinating=procrastinating,procrastinate,procrastination|being bored=bored,boredom|overthinking=overthinking,overthink|biting nails=nails,nail,biting|a nosebleed=nosebleed,nose|sneezing=sneezing,sneeze|being shy=shy|yawning=yawning,yawn|a cough=cough',
      'my mom is|the best=best|always mad=mad,angry|taking my phone=phone|so annoying=annoying|my best friend=friend|a teacher=teacher|never home=home|too strict=strict|a superhero=superhero,hero|always right=right',
      'things to do when|bored|you cant sleep=sleep|it rains=rains,rain,raining|you are sad=sad|home alone=alone|it snows=snows,snow|your friends are busy=busy,friends|in a car=car|the wifi is down=wifi,internet|at a sleepover=sleepover',
      'my best friend|is moving away=moving,move,away|ignores me=ignores,ignore|is mad at me=mad|birthday ideas=birthday|quiz|is a dog=dog|quotes=quotes,quote|has a crush=crush|doesnt text back=text|is annoying=annoying',
      'why am i|always tired=tired|so hungry=hungry|always cold=cold|so bored=bored|so short=short|sneezing=sneezing,sneeze|so lazy=lazy|not growing=growing,grow|always sleepy=sleepy|like this=this',
      'how to make friends|at school=school|online|as a teen=teen,teenager|at camp=camp|when you are shy=shy|in a new city=city|at work=work|in college=college|with your neighbors=neighbors,neighbor|on discord=discord',
      'what to do on|a rainy day=rainy,rain|your birthday=birthday|a snow day=snow|the weekend=weekend|summer break=summer|halloween|a road trip=road,trip|new years eve=years,eve|a sleepover=sleepover|valentines day=valentines,valentine'
    ],
    school: [
      'how to study for|a test=test|finals=finals,final|math|exams=exams,exam|a spelling test=spelling|history|science|biology|the sat=sat|a quiz=quiz',
      'why is math|so hard=hard|important|so boring=boring|everywhere|called math=called,name|fun|a language=language|real|useful|invented=invented,invent',
      'is homework|bad|necessary|illegal|helpful|a waste of time=waste|good for you=good|stressful=stressful,stress|banned|graded=graded,grade|optional',
      'how to focus|in class=class|on homework=homework|while studying=studying,study|better|on reading=reading,read|when tired=tired|with noise=noise|for a long time=long|on one thing=one,thing|during exams=exams,exam',
      'why do we have to|go to school=school|learn math=math|sleep|eat|pay taxes=taxes,tax|wear uniforms=uniforms,uniform|do homework=homework|learn history=history|wake up early=early,wake|read shakespeare=shakespeare',
      'how to write|an essay=essay|a poem=poem|a story=story|a book=book|a letter=letter|in cursive=cursive|a song=song|a speech=speech|a resume=resume|neatly=neatly,neat',
      'best way to|learn a language=language|memorize things=memorize,memory|study=study|learn math=math|take notes=notes,note|wake up=wake|save money=money,save|make friends=friends,friend|learn to type=type,typing|read faster=read,faster',
      'what grade is a|90=90|85=85|70=70|75=75|80=80|60=60|95=95|100=100|50=50|65=65',
      'what is the hardest|subject in school=subject|language to learn=language|math problem=problem|word to spell=spell,word|test in the world=test|instrument to learn=instrument|sport=sport|class in college=college,class|puzzle=puzzle|riddle=riddle'
    ]
  };

  // words the AI may blurt out when it guesses wrong (plus answers from other searches)
  AF.DECOYS = ['funny', 'weird', 'scary', 'cool', 'fast', 'slow', 'loud', 'quiet', 'green', 'pizza', 'robots', 'aliens',
    'sleep', 'money', 'school', 'music', 'dance', 'magic', 'jump', 'swim', 'cats', 'cheese', 'space', 'phone', 'games',
    'hungry', 'clean', 'happy', 'angry', 'dangerous', 'expensive', 'rainbow', 'shiny', 'cold', 'hot'];
})(window.AF = window.AF || {});
