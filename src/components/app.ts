// npm install --save-dev @types/jquery
// npm install tabulator-tables --save
// npm i --save-dev @types/tabulator-tables

//import {CellComponent, ColumnDefinition, Filter, Options, RowComponent, TabulatorFull as Tabulator} from 'tabulator-tables';
import {CellComponent, ColumnDefinition, Options, TabulatorFull as Tabulator} from 'tabulator-tables';


export interface EnshroudedFood {
	version: number;
	items: Item[];
}

export enum FoodType {
	sweet = "sweet",
	liquid = "liquid",
	eggs = "eggs",
	herb = "herb",
	fruit = "fruit",
	grain_product = "grain_product",
	vegetable = "vegetable",
	mushroom = "mushroom",
	meat_food = "meat_food",
	bandage = "bandage",
	ectoplasm_soup = "ectoplasm_soup",
	potion = "potion",
}

export interface Item {
	name: string;
	count?: number;
	effect?: string;
	duration?: string;
	type?: FoodType;
	requirements?: string[];
	ingredients?: Ingredient[]
}

export interface Ingredient {
	name: string;
	count?: number;
}


// noinspection TypeScriptUnresolvedFunction
export class App {
	version = '1.0';

	localStorageJsonName = "enshrouded-food";

	localStorageVersionName = "enshrouded-food-version";

	jsonUrl = 'assets/enshrouded-food.json?v=' + this.version;

	tabledata: Item[] = [];

	table!: Tabulator;

	init(): void {
		//($('.selectpicker') as any).selectpicker();

		try {
			const localStorageJsonNameValue = window.localStorage.getItem(this.localStorageJsonName);
			const localStorageVersionNameValue = window.localStorage.getItem(this.localStorageVersionName);
			console.log('localStorageVersionNameValue ' + localStorageVersionNameValue);
			console.log('version ' + this.version);
			console.log(localStorageVersionNameValue == this.version);
			/*if (localStorageJsonNameValue && localStorageVersionNameValue == this.version) {
				const __data: EnshroudedFood = JSON.parse(localStorageJsonNameValue);
				const test = __data.version;
				this.app(__data);
			} else {*/
			this.fetchDataAgain();
			//}
		} catch (e) {
			console.error(e);
			this.fetchDataAgain();
		}
	}

	fetchDataAgain(): void {
		console.log('fetchDataAgain ' + this.jsonUrl);
		fetch(this.jsonUrl)
			.then((response: Response) => response.json() as Promise<EnshroudedFood>)
			.then((enshroudedFood: EnshroudedFood) => this.app(enshroudedFood));
	}

	app(enshroudedFood: EnshroudedFood): void {
		window.localStorage.setItem(this.localStorageJsonName, JSON.stringify(enshroudedFood));
		window.localStorage.setItem(this.localStorageVersionName, this.version);

		const itemsMap = new Map<string, Item>();
		enshroudedFood.items.filter(item => !!item.ingredients).forEach(item => itemsMap.set(item.name, item));
		const allIngredients: string[] = [];
		const allRequirements: string[] = [];
		const allItems: string[] = [];

		for (const item of enshroudedFood.items) {
			if (item.effect) {
				allItems.push(item.name);
				const allRequirementsForItem: string[] = [];
				item.requirements?.forEach(r => allRequirementsForItem.push(r));
				let ingredientsCollected: Ingredient[];
				if (item.ingredients) {
					const localWeight = 1 / (item.count ?? 1);
					const tmp = this.collateIngredients(allIngredients, allRequirementsForItem, itemsMap, localWeight, item.ingredients);
					ingredientsCollected = this.collapseIngredients(tmp);
				} else {
					ingredientsCollected = [];
				}
				ingredientsCollected.forEach(it => {
					it.count = Number(it.count!.toFixed(1));
					if (it.count == 0) it.count = 0.1;
				})
				const consolidated: Item = {
					name: item.name,
					requirements: allRequirementsForItem,
					effect: item.effect,
					type: item.type,
					duration: item.duration,
					ingredients: ingredientsCollected
				};
				console.log(JSON.stringify(consolidated, null, 2));
				this.tabledata.push(consolidated);
				allRequirementsForItem.filter(r => !allRequirements.includes(r)).forEach(r => allRequirements.push(r));
			}
		}
		allRequirements.sort();
		console.log("allRequirements");
		allRequirements.forEach(x => console.log(x + ","));
		allIngredients.sort();
		console.log("allIngredients", JSON.stringify(allIngredients, null, 2));
		allItems.sort();
		console.log("allItems", JSON.stringify(allItems, null, 2));

		const columDefs: ColumnDefinition[] = [];
		columDefs.push({
			title: "Name",
			field: "name",
			frozen: true,
			formatter: (cell: CellComponent, formatterParams: object) => {
				const foodRow: Item = cell.getData() as Item;
				let tooltip = foodRow.name + "\n";
				foodRow.ingredients?.forEach(ingredient => {
					tooltip += ingredient.count + "x " + ingredient.name + "\n";
				});
				return `<div title="${tooltip}">
							<img width=32 height=32 src="assets/images/${foodRow.name.replaceAll(' ', '-')}.png">&nbsp;${foodRow.name}
						</div>`;
			}
		});
		const infoGroupColumDef: ColumnDefinition = {//create column group
			title: "Info",
			frozen: true,
			columns: []
		};
		columDefs.push(infoGroupColumDef);
		infoGroupColumDef.columns!.push({
			title: "Effect",
			field: "effect",
			formatter: (cell: CellComponent, formatterParams: object) => {
				const foodRow: Item = cell.getData() as Item;
				return foodRow.effect!.replaceAll(",", "<br>");
			}
		});
		infoGroupColumDef.columns!.push({
			title: "Type",
			field: "type",
			headerVertical: true
		});
		infoGroupColumDef.columns!.push({
			title: "Duration",
			field: "duration",
			headerVertical: true
		});
		const ingredientsGroupColumDef: ColumnDefinition = {//create column group
			title: "Info",
			columns: []
		};
		columDefs.push(ingredientsGroupColumDef);
		allIngredients.forEach(ingredient => {
			ingredientsGroupColumDef.columns!.push({
				title: ingredient,
				headerVertical: true,
				hozAlign: "center",
				sorter: "number",
				formatter: (cell) => {
					const data = cell.getData();
					const ingredients = data['ingredients'] as Ingredient[];
					if (!ingredients) return "";
					const m: Ingredient[] = ingredients.filter(x => x.name === ingredient);
					if (!m || m.length == 0) return "";
					return String(m.at(0)?.count ?? 0);
				}
			});
		});
		const options: Options = {
			//placeholder: "Awaiting Data",
			//height: '700', // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
			data: this.tabledata, //assign data to table
			//layout: "fitColumns", //fit columns to width of table (optional)
			//layout: "fitDataTable",
			layoutColumnsOnNewData: true,
			// responsiveLayout:"hide", // hide rows that no longer fit
			// responsiveLayout:"collapse", // collapse columns that no longer fit on the table into a list under the row
			resizableRows: false, // this option takes a boolean value (default = false)
			selectableRows: true, //make rows selectable
			columns: columDefs,
			//rowHeight: 40,
		};
		this.table = new Tabulator("#tabulator", options);
	}

	collapseIngredients(ingredients: Ingredient[]): Ingredient[] {
		const collapsed: Ingredient[] = [];
		ingredients.forEach(ingredient => {
			const found = collapsed.filter(c => c.name == ingredient.name);
			if (found && found.length > 0) {
				if (ingredient.count) {
					if (found[0].count) found[0].count += ingredient.count;
					else found[0].count = ingredient.count;
				}
			} else {
				collapsed.push(ingredient);
			}

		});
		return collapsed;
	}

	collateIngredients(allIngredients: string[], allRequirementsForItem: string[], itemsMap: Map<string, Item>, weight: number, ingredients: Ingredient[]): Ingredient[] {
		const ingredientsCollected: Ingredient[] = [];
		for (const ingredient of ingredients) {
			let localWeight = weight * (ingredient.count ?? 1);
			if (itemsMap.has(ingredient.name)) {
				const deep = itemsMap.get(ingredient.name) as Item;
				deep.requirements?.filter(r => !allRequirementsForItem.includes(r)).forEach(r => allRequirementsForItem.push(r));
				if (deep.ingredients) {
					localWeight /= (deep.count ?? 1);
					const deepIngredients: Ingredient[] = this.collateIngredients(allIngredients, allRequirementsForItem, itemsMap, localWeight, deep.ingredients);
					ingredientsCollected.push(...deepIngredients);
				}
			} else {
				if (!allIngredients.includes(ingredient.name)) allIngredients.push(ingredient.name);
				ingredientsCollected.push({name: ingredient.name, count: localWeight});
			}
		}
		return ingredientsCollected;
	}
}
