const Command = require('command')

module.exports = function TuturuMarker(dispatch) {
    const command = Command(dispatch)
    
let enabled = false,
    self_mark = false,
    leaderID,
    playerID,
    colors = {   // Red = 0, Yellow = 1, Blue = 2
    	heal : 1, 
    	tank : 0,
    	dps : 2,
    	me : 2
    },
    tomark = [],
    party = [],
    me = [],
    dead = [],
    heal = [],
    dps = [],
    tank = [];

    let resetparty = () => {
        me = []
        heal = [],
        dps = [],
        tank = [];
    };

    let mark = (marks, me) =>{
    	if(me){
    		dispatch.toClient('S_PARTY_MARKER', 1, {
                markers: marks
            });
    	}
        else{
        	dispatch.toServer('C_PARTY_MARKER', 1, {
            	markers: marks
        	});
        }
    };

    let updateParty = () => {
    	resetparty(); //everytime list update, reset the party first so you do not have duplicates or someone left party.
        for (let member in party){
            if(playerID === party[member].playerId) me.push({color: colors.me, target: party[member].gameId});
            if(party[member].class === 6 || party[member].class === 7) heal.push({color: colors.heal, target: party[member].gameId});
            else if(party[member].class === 1 || party[member].class === 10) tank.push({color: colors.tank, target: party[member].gameId});
            else dps.push({color: colors.dps, target: party[member].gameId});
        }
        if(tomark.length != 0) self_mark ? mark(tomark, true) : mark(tomark, false);
    };

    let processArg = args => {
    	args = args.map(arg => arg.toLowerCase());
		if(args[0] !== 'me' && args[0] !==  'off' && playerID != leaderID){
            command.message('[Tuturu-Marker] Cannot Mark, Require Lead!');
            return;
        };
        if(args[0] ===  'off'){
            tomark.length = 0;
            mark(tomark, false);
            self_mark = false;
            enabled = false;
            command.message('[Tuturu-Marker] Marks Removed.');
            return;
        };
        if(args.length % 2 !== 0 && args.length != 0){
        	command.message('[Tuturu-Marker] Bad Formatting, Please use role color role color... Example. mark heal red dps blue tank yellow.');
        	return;
        };
        for(let arg in args){
			if(arg % 2 !== 0){// Red = 0, Yellow = 1, Blue = 2
        		if(args[arg] === 'red') colors[args[arg-1]] = 0;
        		else if(args[arg] === 'yellow') colors[args[arg-1]] = 1;
        		else if(args[arg] === 'blue') colors[args[arg-1]] = 2;
        		else {
        			command.message('[Tuturu-Marker] Invalid colors, accepted colors are: Red, Yellow, Blue.');
        			return;
        		}
        	}
        };
        updateParty();
        tomark = [];
        for(let arg in args){
        	if(arg % 2 === 0){
        		if(args[arg] === 'me'){
        			tomark = tomark.concat(me);
        			self_mark = true;
        		}
        		else if(args[arg] === 'heal'){
        			tomark = tomark.concat(heal);
        			self_mark = false;
        		}
        		else if(args[arg] === 'dps'){
        			tomark = tomark.concat(dps);
        			self_mark = false;
        		}
        		else if(args[arg] === 'tank'){
        			tomark = tomark.concat(tank);
        			self_mark = false;
        		}
        		else {
        			command.message('[Tuturu-Marker] Invalid roles, accepted roles are: Heal, Tank, DPS.');
        			return;
        		}
        	}
        };
        enabled = true;
        command.message('[Tuturu-Marker] Auto Mark Enabled.');
        self_mark ? mark(tomark, true) : mark(tomark, false);
    }

    command.add('mark', (...args) => {
    	processArg(args);
    });

    dispatch.hook('S_LOGIN', 10, (event) => {	
		playerID = event.playerId;
    });

    dispatch.hook('S_SPAWN_USER', 13, (event) => {
    if(!enabled) return;	
		for (let member in party){
           if(JSON.stringify(party[member].gameId) === JSON.stringify(event.gameId) && tomark.length != 0) self_mark ? mark(tomark, true) : mark(tomark, false);
        }
    });

    dispatch.hook('S_PARTY_MEMBER_LIST', 6, event => {
        leaderID = event.leaderPlayerId;
        party = event.members;
        if(enabled) updateParty();	
    });

    dispatch.hook('S_CHANGE_PARTY_MANAGER', 1, event => {
        leaderID = event.target.high;
    });
    
    dispatch.hook('S_PARTY_MEMBER_STAT_UPDATE', 3, (event) => {
		if (!enabled) return;
        if(event.alive === 0 && !dead.includes(event.playerId)){
            dead.push(event.playerId)
        }
        if(event.alive === 1 && dead.includes(event.playerId)){
            let index = dead.indexOf(event.playerId);
            dead.splice(index, 1);
            if(tomark.length !=0) self_mark ? mark(tomark, true) : mark(tomark, false);
        }
	});
};