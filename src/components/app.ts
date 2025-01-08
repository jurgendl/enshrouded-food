// npm install --save-dev @types/jquery
// npm install tabulator-tables --save
// npm i --save-dev @types/tabulator-tables

export interface EnshroudedFood {
	version: number;
	items: Item[];
}

export interface Item {
	name: string;
	count?: number;
	effect?: string;
	duration?: string;
	type?: string;
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
		($('.selectpicker') as any).selectpicker();

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
		console.log(enshroudedFood);
		window.localStorage.setItem(this.localStorageJsonName, JSON.stringify(enshroudedFood));
		window.localStorage.setItem(this.localStorageVersionName, this.version);

		const itemsMap = new Map<string, Item>();
		enshroudedFood.items.filter(item => !!item.ingredients).forEach(item => itemsMap.set(item.name, item));
		const allReqs: string[] = [];
		const allItems: string[] = [];

		for (const item of enshroudedFood.items) {
			if (item.effect) {
				allItems.push(item.name);
				const reqs: string[] = [];
				item.requirements?.forEach(r => reqs.push(r));
				let ingredientsCollected: Ingredient[];
				if (item.ingredients) {
					const localWeight = 1 / (item.count ?? 1);
					const tmp = this.collateIngredients(allReqs, reqs, itemsMap, localWeight, item.ingredients);
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
					requirements: reqs,
					effect: item.effect,
					type: item.type,
					duration: item.duration,
					ingredients: ingredientsCollected
				};
				console.log(JSON.stringify(consolidated, null, 2));
			}
		}
		allReqs.sort();
		console.log(JSON.stringify(allReqs, null, 2));
		allItems.sort();
		console.log(JSON.stringify(allItems, null, 2));
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

	collateIngredients(allReqs: string[], reqs: string[], itemsMap: Map<string, Item>, weight: number, ingredients: Ingredient[]): Ingredient[] {
		const ingredientsCollected: Ingredient[] = [];
		for (const ingredient of ingredients) {
			if (!allReqs.includes(ingredient.name)) allReqs.push(ingredient.name);
			let localWeight = weight * (ingredient.count ?? 1);
			if (itemsMap.has(ingredient.name)) {
				const deep = itemsMap.get(ingredient.name) as Item;
				deep.requirements?.forEach(r => reqs.push(r));
				if(deep.ingredients) {
					localWeight /= (deep.count ?? 1);
					const deepIngredients: Ingredient[] = this.collateIngredients(allReqs, reqs, itemsMap, localWeight, deep.ingredients);
					ingredientsCollected.push(...deepIngredients);
				}
			} else {
				ingredientsCollected.push({name: ingredient.name, count: localWeight});
			}
		}
		return ingredientsCollected;
	}
}
