/**
 * This $ plugin helps to sort a particular column in a table
 * @author Jinzhe Li (jinjinwudi@gmail.com)
 */
$.fn.sortColumn = function (options) {
	var $table = this;

	// Get the default options
    var opts = $.extend({}, $.fn.sortColumn.defaults, options);
    var order = opts.order;
    var index = opts.index;
    var format = opts.format;

    // Define the comparator function
    function sortFunction(index,format) {
        return function (a, b) {
            var dataA=$(a).children("td:nth-child("+index+")").html();
            var dataB=$(b).children("td:nth-child("+index+")").html();
            // Format : dd-mm-yyyy
            if (format=='dd-mm-yyyy'){
	            if (dataA==""){
	                dataA='01-01-1970';
	            }
	            if (dataB==""){
	                dataB='01-01-1970';
	            }

	            dataA=dataA.split('-');
	            dataB=dataB.split('-');

	            dataA=new Date(dataA[2],dataA[1]-1,dataA[0]).getTime();
	            dataB=new Date(dataB[2],dataB[1]-1,dataB[0]).getTime();

	            if (dataA>dataB)
	                return 1;
	            else if (dataA==dataB)
	                return 0;
	            else
	                return -1;
	        }
	        // Format : dd/mm/yyyy
	        if (format=='dd/mm/yyyy'){
	            if (dataA==""){
	                dataA='01/01/1970';
	            }
	            if (dataB==""){
	                dataB='01/01/1970';
	            }

	            dataA=dataA.split('/');
	            dataB=dataB.split('/');

	            dataA=new Date(dataA[2],dataA[1]-1,dataA[0]).getTime();
	            dataB=new Date(dataB[2],dataB[1]-1,dataB[0]).getTime();

	            if (dataA>dataB)
	                return 1;
	            else if (dataA==dataB)
	                return 0;
	            else
	                return -1;
	        }
	        // Format : number
	        if (format=='number'){

                // in case of bad values
                if (!dataA && !dataB)
                    return 0;
                if (!dataA)
                    return -1;
                if (!dataB)
                    return 1;

	        	return dataA-dataB;
	        }
	        // Format : currency
	        if (format=='currency'){
	        	dataA=dataA.replace(/\$/g,'');
	        	dataA=dataA.replace(/\,/g,'');
	        	dataB=dataB.replace(/\$/g,'');
	        	dataB=dataB.replace(/\,/g,'');
	        	return dataA-dataB;
	        }

	        if (format=='string') {

                // in case of bad values
                if (!dataA && !dataB)
                    return 0;
                if (!dataA)
                    return -1;
                if (!dataB)
                    return 1;

	        	if (dataA>dataB) {
	        		return 1;
	        	} else if (dataA==dataB) {
	        		return 0;
	        	} else {
	        		return -1;
	        	}
	        }

            // custom time format (min:sec)
            if (format=='00:00') {

                // in case of bad values
                if (!dataA && !dataB)
                    return 0;
                if (!dataA)
                    return -1;
                if (!dataB)
                    return 1;

                var numsA = dataA.split(':');
                var numsB = dataB.split(':');

                var secA = parseInt(numsA[1]);
                var secB = parseInt(numsB[1]);

                var minA = parseInt(numsA[0]);
                var minB = parseInt(numsB[0]);

                var secA = (minA * 60) + secA;
                var secB = (minB * 60) + secB;

                return secA - secB;
            }
        };
    }

    var original=[];
    var sorte=[];
    $table.children("tbody").children("tr").each(function(index,ele){
        original.push(ele);
    });

    sorted = original.sort(sortFunction(index,format));
    if (order=='desc')
        sorted=sorted.reverse();
    $table.children("tbody").html(sorted);

};
// Default parameter
$.fn.sortColumn.defaults = {
    index: 1, /* index is 1 based instead of 0 based because of css nth:child(index) */
    order: 'asc',
    format: 'string'
};

