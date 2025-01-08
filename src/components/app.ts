// npm install --save-dev @types/jquery
// npm install tabulator-tables --save
// npm i --save-dev @types/tabulator-tables

import {TabulatorFull as Tabulator} from 'tabulator-tables';

//import {Tabulator} from "tabulator-tables";

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

		//define data array
		const tabledata = [
			{id: 1, name: "Oli Bob", progress: 12, gender: "male", rating: 1, col: "red", dob: "19/02/1984", car: 1},
			{id: 2, name: "Mary May", progress: 1, gender: "female", rating: 2, col: "blue", dob: "14/05/1982", car: true},
			{id: 3, name: "Christine Lobowski", progress: 42, gender: "female", rating: 0, col: "green", dob: "22/05/1982", car: "true"},
			{id: 4, name: "Brendon Philips", progress: 100, gender: "male", rating: 1, col: "orange", dob: "01/08/1980"},
			{id: 5, name: "Margret Marmajuke", progress: 16, gender: "female", rating: 5, col: "yellow", dob: "31/01/1999"},
			{id: 6, name: "Frank Harbours", progress: 38, gender: "male", rating: 4, col: "red", dob: "12/05/1966", car: 1},
		];

		//initialize table
		const table = new Tabulator("#tabulator", {
			data: tabledata, //assign data to table
			autoColumns: true, //create columns from data field names
			height: "100%",
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

	collateIngredients(allIngredients: string[], allRequirementsForItem: string[], itemsMap: Map<string, Item>, weight: number, ingredients: Ingredient[]): Ingredient[] {
		const ingredientsCollected: Ingredient[] = [];
		for (const ingredient of ingredients) {
			if (!allIngredients.includes(ingredient.name)) allIngredients.push(ingredient.name);
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
				ingredientsCollected.push({name: ingredient.name, count: localWeight});
			}
		}
		return ingredientsCollected;
	}
}
