// npm install --save-dev @types/jquery
// npm install tabulator-tables --save
// npm i --save-dev @types/tabulator-tables

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/translucent.css';

//import {CellComponent, ColumnDefinition, Filter, Options, RowComponent, TabulatorFull as Tabulator} from 'tabulator-tables';
import {CellComponent, ColumnDefinition, Options, TabulatorFull as Tabulator} from 'tabulator-tables';


export interface EnshroudedFood {
	version: number;
	biomes: Biome[];
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

export interface Biome {
	name: string;
	requirements: string[];
	ingredients: string[];
}

export interface Item {
	name: string;
	count?: number;
	effect?: string;
	duration?: string;
	type?: FoodType;
	requirements?: string[];
	ingredients?: Ingredient[];
	level: number | undefined;
}

export interface Ingredient {
	name: string;
	count?: number;
}

// must cast as any to set property on window
const _global = (window /* browser */ || global /* node */) as any;
//_global.$scrollToAnchor = scrollToAnchor;
_global.$tippy = tippy;

// noinspection TypeScriptUnresolvedFunction
export class App {
	version = '1.0';

	localStorageJsonName = "enshrouded-food";

	localStorageVersionName = "enshrouded-food-version";

	jsonUrl = 'assets/enshrouded-food.json?v=' + this.version;

	tabledata: Item[] = [];

	table?: Tabulator = undefined;

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

		const initTooltips: string [] = [];

		const itemsMap = new Map<string, Item>();
		enshroudedFood.items.filter(item => !!item.ingredients).forEach(item => itemsMap.set(item.name, item));
		const allRequirements: string[] = [];

		for (const item of enshroudedFood.items) {
			if (item.effect) {
				const allRequirementsForItem: string[] = [];
				item.requirements?.forEach(r => allRequirementsForItem.push(r));
				let ingredientsCollected: Ingredient[];
				if (item.ingredients) {
					const localWeight = 1 / (item.count ?? 1);
					const tmp = this.collateIngredients(allRequirementsForItem, itemsMap, localWeight, item.ingredients);
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
					ingredients: ingredientsCollected,
					level: -1
				};
				this.tabledata.push(consolidated);
				allRequirementsForItem.filter(r => !allRequirements.includes(r)).forEach(r => allRequirements.push(r));
			}
		}

		const ingredientsByBiome0 = new Map<string, number>();
		const biomesForIngredients = new Map<string, string>();
		enshroudedFood.biomes.forEach((biome, index) => {
			biome.ingredients.forEach(ingredient => {
				{
					const biomesForIngredient = biomesForIngredients.get(ingredient);
					biomesForIngredients.set(ingredient, (biomesForIngredient ? biomesForIngredient + '\n' : '') + biome.name);
				}
				{
					const oldIndex = ingredientsByBiome0.get(ingredient);
					if (oldIndex) {
						if (oldIndex > index) {
							ingredientsByBiome0.set(ingredient, index);
						}
					} else {
						ingredientsByBiome0.set(ingredient, index);
					}
				}
			});
		});
		//console.log(ingredientsByBiome);
		//console.log(biomesForIngredients);

		const ingredientsForItems: string[] = [];
		this.tabledata.forEach(tableRow => {
			tableRow.ingredients?.forEach(ingredient => {
				if (!ingredientsForItems.includes(ingredient.name)) ingredientsForItems.push(ingredient.name);
				const level = ingredientsByBiome0.get(ingredient.name);
				if (level != undefined) if (tableRow.level != undefined) if (tableRow.level < level) tableRow.level = level;
			});
			{
				if (!ingredientsForItems.includes(tableRow.name)) ingredientsForItems.push(tableRow.name);
				const level = ingredientsByBiome0.get(tableRow.name);
				if (level != undefined) if (tableRow.level != undefined) if (tableRow.level < level) tableRow.level = level;
			}
		});
		this.tabledata.sort((a, b) => String(a.level).localeCompare(String(b.level)) || a.name.localeCompare(b.name));
		//console.log(ingredientsForItems);
		//console.log(JSON.stringify(this.tabledata, null, 2));

		const columDefs: ColumnDefinition[] = [];
		columDefs.push({
			title: "Name",
			field: "name",
			frozen: true,
			formatter: (cell: CellComponent, formatterParams: object) => {
				const foodRow: Item = cell.getData() as Item;
				let tooltip = foodRow.name + "\n";
				if (foodRow.ingredients) {
					foodRow.ingredients!.forEach(ingredient => {
						tooltip += ingredient.count + "x " + ingredient.name + "\n";
					});
				}
				const localId = "rowheader_" + foodRow.name.replaceAll(' ', '_');
				initTooltips.push(localId);
				return `<div id="${localId}" title="${tooltip}">
							<img width=32 height=32 src="assets/enshrouded-images/${foodRow.name.replaceAll(' ', '_')}.webp">&nbsp;${foodRow.name}
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
		// eslint-disable-next-line no-constant-condition
		if (false) infoGroupColumDef.columns!.push({
			title: "Level",
			field: "level",
			headerVertical: true
		});
		const ingredientsGroupColumDef: ColumnDefinition = {//create column group
			title: "Ingredients",
			columns: []
		};
		columDefs.push(ingredientsGroupColumDef);
		enshroudedFood.biomes.forEach((biome, index) => {
			const biomeGroupColumDef: ColumnDefinition = {//create column group
				title: biome.name,
				columns: []
			};
			ingredientsGroupColumDef.columns!.push(biomeGroupColumDef);
			const ingredientsForItemsForBiome: string[] = [];
			ingredientsForItems.forEach(ingredientForItem => {
				if (index == ingredientsByBiome0.get(ingredientForItem)) ingredientsForItemsForBiome.push(ingredientForItem);
			});
			ingredientsForItemsForBiome.sort((a, b) => a.localeCompare(b));
			ingredientsForItemsForBiome.forEach(ingredientName => {
				const localId = "colheader_" + ingredientName.replaceAll(' ', '_');
				initTooltips.push(localId);
				const tooltip = ingredientName + "\n\n" + biomesForIngredients.get(ingredientName);
				biomeGroupColumDef.columns!.push({
					title: `<span id="${localId}" title="${tooltip}">
								<img width=32 height=32 src="assets/enshrouded-images/${ingredientName.replaceAll(' ', '_')}.webp">&nbsp;${ingredientName}
							</span>`,
					headerVertical: true,
					hozAlign: "center",
					sorter: "number",
					field: ingredientName + "_value",
					mutatorParams: {},
					// https://tabulator.info/docs/6.3/mutators
					mutator: (value: any, data: Item, type: any, params: any, component: CellComponent | undefined): number | undefined => {
						//value - original value of the cell
						//data - the data for the row
						//type - the type of mutation occurring  (data|edit)
						//params - the mutatorParams object from the column definition
						//component - when the "type" argument is "edit", this contains the cell component for the edited cell, otherwise it is the column component for the column
						//return the new value for the cell data.
						if (!data.ingredients || data.ingredients.length == 0) return undefined;
						const ingredients: Ingredient[] = data.ingredients.filter(x => x.name == ingredientName);
						if (!ingredients || ingredients.length == 0) return undefined;
						return ingredients[0].count;
					}
				});
			});
		});
		const options: Options = {
			//placeholder: "Awaiting Data",
			height: '100%', // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
			data: this.tabledata, //assign data to table
			//layout: "fitColumns", //fit columns to width of table (optional)
			//layout: "fitDataTable",
			layoutColumnsOnNewData: true,
			// responsiveLayout:"hide", // hide rows that no longer fit
			// responsiveLayout:"collapse", // collapse columns that no longer fit on the table into a list under the row
			resizableRows: false, // this option takes a boolean value (default = false)
			selectableRows: false, //make rows selectable
			columns: columDefs,
			//rowHeight: 40,
		};
		this.table = new Tabulator("#tabulator", options);
		this.table.on("tableBuilt", () => {
			initTooltips.forEach(id => {
				const title = document.getElementById(id)?.getAttribute("title");
				if (title) {
					//document.getElementById(id)!.removeAttribute("title")
					//this.createPopOver(id, title);
					//console.log("init tippyjs", id, title.replaceAll("\n", "<br>"));
				}
			});
		});
	}

	private createPopOver(id: string, content: string) {
		tippy('#' + id, {
			content: `${content}`,
			allowHTML: true,
			theme: 'light-border',
			arrow: true,
			trigger: 'click',
			interactive: true,
			animation: 'scale',
		});
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

	collateIngredients(allRequirementsForItem: string[], itemsMap: Map<string, Item>, weight: number, ingredients: Ingredient[]): Ingredient[] {
		const ingredientsCollected: Ingredient[] = [];
		for (const ingredient of ingredients) {
			let localWeight = weight * (ingredient.count ?? 1);
			if (itemsMap.has(ingredient.name)) {
				const deep = itemsMap.get(ingredient.name) as Item;
				deep.requirements?.filter(r => !allRequirementsForItem.includes(r)).forEach(r => allRequirementsForItem.push(r));
				if (deep.ingredients) {
					localWeight /= (deep.count ?? 1);
					const deepIngredients: Ingredient[] = this.collateIngredients(allRequirementsForItem, itemsMap, localWeight, deep.ingredients);
					ingredientsCollected.push(...deepIngredients);
				}
			} else {
				ingredientsCollected.push({name: ingredient.name, count: localWeight});
			}
		}
		return ingredientsCollected;
	}
}
